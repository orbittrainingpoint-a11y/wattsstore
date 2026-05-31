/** Local-disk file storage helper — used when STORAGE_DRIVER=local (no MinIO needed). */
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from './env';

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/octet-stream': 'bin',
};

function resolveUploadsRoot(): string {
  return path.isAbsolute(env.UPLOADS_DIR) ? env.UPLOADS_DIR : path.resolve(process.cwd(), env.UPLOADS_DIR);
}

export const UPLOADS_ROOT = resolveUploadsRoot();

export async function ensureLocalUploadsDir(): Promise<void> {
  await fs.mkdir(UPLOADS_ROOT, { recursive: true });
}

export function buildLocalKey(folder: string, mime: string): string {
  const ext = EXT_BY_MIME[mime] ?? 'bin';
  return `${folder}/${randomUUID()}.${ext}`;
}

export function publicLocalUrl(storageKey: string): string {
  const base = env.UPLOADS_PUBLIC_PATH.replace(/\/$/, '');
  return `${base}/${storageKey}`;
}

export async function writeLocalFile(storageKey: string, buffer: Buffer): Promise<void> {
  const filePath = path.join(UPLOADS_ROOT, storageKey);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
}

export async function deleteLocalFile(storageKey: string): Promise<void> {
  const filePath = path.join(UPLOADS_ROOT, storageKey);
  await fs.unlink(filePath).catch(() => undefined);
}
