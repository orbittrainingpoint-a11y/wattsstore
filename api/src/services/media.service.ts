import { prisma } from '../config/database';
import { BUCKET, buildObjectKey, deleteObject, presignedDownload, presignedUpload } from '../config/minio';
import { buildLocalKey, deleteLocalFile, publicLocalUrl, writeLocalFile } from '../config/localStorage';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'application/octet-stream',
]);
const FOLDERS = new Set(['banners', 'products', 'documents', 'blog', 'testimonials', 'legal', 'misc']);

export interface MediaInput {
  url: string;
  storageKey?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
  folder?: string;
  tags?: string[];
}

function validateFolder(folder: string) {
  if (!FOLDERS.has(folder)) throw AppError.badRequest('INVALID_FOLDER', 'Unknown media folder.');
}

function validateMime(mimeType: string) {
  if (!ALLOWED_MIMES.has(mimeType)) throw AppError.badRequest('INVALID_MIME', 'Only images, PDF, text and IES-style document files are allowed.');
}

function publicMediaUrl(id: number, storageKey?: string | null, url?: string | null) {
  // Local storage: files are served directly via Express static — return the stored URL.
  if (env.STORAGE_DRIVER === 'local') return url ?? '';
  // MinIO: route through the presigned-redirect endpoint so URLs stay short-lived.
  return storageKey ? `/api/v1/media/${id}/file` : (url ?? '');
}

function presentMediaAsset<T extends { id: number; storageKey?: string | null; url?: string | null }>(asset: T): T {
  return { ...asset, url: publicMediaUrl(asset.id, asset.storageKey, asset.url) };
}

export const mediaService = {
  /** Used by the presign-then-PUT-then-register flow. Local mode tells the client to use uploadDirect instead. */
  async presign(input: { filename: string; mimeType: string; folder?: string }) {
    const folder = input.folder ?? 'misc';
    validateFolder(folder);
    validateMime(input.mimeType);
    if (env.STORAGE_DRIVER === 'local') {
      // Tell the client to use the direct upload endpoint — no presign needed locally.
      return { driver: 'local' as const, filename: input.filename };
    }
    const storageKey = buildObjectKey(`media/${folder}`, input.mimeType);
    const uploadUrl = await presignedUpload(storageKey);
    const publicUrl = `${env.MINIO_PUBLIC_URL.replace(/\/$/, '')}/${BUCKET}/${storageKey}`;
    return { driver: 'minio' as const, uploadUrl, storageKey, publicUrl, filename: input.filename };
  },

  /**
   * One-shot upload + register for local storage. File arrives as base64 inside JSON
   * (10 MB body limit handles ~7.5 MB raw payloads). Writes to disk, then creates the
   * MediaAsset row.
   */
  async uploadDirect(
    input: { filename: string; mimeType: string; folder?: string; dataBase64: string; altText?: string | null; tags?: string[] },
    uploadedBy: number,
  ) {
    const folder = input.folder ?? 'misc';
    validateFolder(folder);
    validateMime(input.mimeType);
    const buffer = Buffer.from(input.dataBase64, 'base64');
    if (!buffer.length) throw AppError.badRequest('EMPTY_FILE', 'Upload contained no data.');
    if (env.STORAGE_DRIVER === 'local') {
      const storageKey = buildLocalKey(`media/${folder}`, input.mimeType);
      await writeLocalFile(storageKey, buffer);
      const publicUrl = publicLocalUrl(storageKey);
      const created = await (prisma as any).mediaAsset.create({
        data: {
          url: publicUrl,
          storageKey,
          filename: input.filename,
          mimeType: input.mimeType,
          sizeBytes: buffer.length,
          altText: input.altText ?? null,
          folder,
          tags: input.tags ?? [],
          uploadedBy,
        },
      });
      return presentMediaAsset({ ...created, url: publicUrl, storageKey: null }); // storageKey: null so publicMediaUrl returns the static path
    }
    // MinIO direct upload path (server-side PUT, used when presign isn't desirable).
    const { putObject } = await import('../config/minio');
    const storageKey = buildObjectKey(`media/${folder}`, input.mimeType);
    await putObject(storageKey, buffer, input.mimeType);
    const publicUrl = `${env.MINIO_PUBLIC_URL.replace(/\/$/, '')}/${BUCKET}/${storageKey}`;
    const created = await (prisma as any).mediaAsset.create({
      data: {
        url: publicUrl,
        storageKey,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: buffer.length,
        altText: input.altText ?? null,
        folder,
        tags: input.tags ?? [],
        uploadedBy,
      },
    });
    return presentMediaAsset(created);
  },

  async list(filter: { search?: string; folder?: string }, skip: number, take: number) {
    if (filter.folder) validateFolder(filter.folder);
    const where: Record<string, unknown> = {
      ...(filter.folder ? { folder: filter.folder } : {}),
      ...(filter.search
        ? {
            OR: [
              { filename: { contains: filter.search, mode: 'insensitive' } },
              { altText: { contains: filter.search, mode: 'insensitive' } },
              { tags: { has: filter.search } },
            ],
          }
        : {}),
    };
    const [items, totalCount] = await Promise.all([
      (prisma as any).mediaAsset.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      (prisma as any).mediaAsset.count({ where }),
    ]);
    return { items: items.map(presentMediaAsset), totalCount };
  },

  async register(input: MediaInput, uploadedBy: number) {
    const folder = input.folder ?? 'misc';
    validateFolder(folder);
    validateMime(input.mimeType);
    const created = await (prisma as any).mediaAsset.create({
      data: {
        url: input.url,
        storageKey: input.storageKey ?? null,
        filename: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes ?? 0,
        width: input.width ?? null,
        height: input.height ?? null,
        altText: input.altText ?? null,
        folder,
        tags: input.tags ?? [],
        uploadedBy,
      },
    });
    return presentMediaAsset(created);
  },

  async downloadUrl(id: number) {
    const item = await (prisma as any).mediaAsset.findUnique({ where: { id } });
    if (!item) throw AppError.notFound('MEDIA_NOT_FOUND', 'Media asset not found.');
    if (env.STORAGE_DRIVER === 'local' || !item.storageKey) return item.url;
    return presignedDownload(item.storageKey, 10 * 60);
  },

  async delete(id: number) {
    const item = await (prisma as any).mediaAsset.findUnique({ where: { id } });
    if (!item) throw AppError.notFound('MEDIA_NOT_FOUND', 'Media asset not found.');
    await (prisma as any).mediaAsset.delete({ where: { id } });
    if (item.storageKey) {
      if (env.STORAGE_DRIVER === 'local') await deleteLocalFile(item.storageKey);
      else await deleteObject(item.storageKey).catch(() => undefined);
    }
    return { deleted: true };
  },
};
