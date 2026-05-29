/** MinIO client + presigned URL helpers. Files never stream through Node — browser ↔ MinIO direct. */
import { Client } from 'minio';
import { randomUUID } from 'crypto';
import { env } from './env';
import { logger } from './logger';

export const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const BUCKET = env.MINIO_BUCKET;

/** Ensure the private bucket exists at boot. */
export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'us-east-1');
    logger.info(`MinIO bucket "${BUCKET}" created`);
  }
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

/** Build a UUID-based object key (original filenames discarded for security). */
export function buildObjectKey(prefix: string, mime: string): string {
  const ext = EXT_BY_MIME[mime] ?? 'bin';
  return `${prefix}/${randomUUID()}.${ext}`;
}

/** Presigned PUT URL for direct browser upload (15-min expiry). */
export function presignedUpload(objectKey: string, expirySeconds = 15 * 60): Promise<string> {
  return minioClient.presignedPutObject(BUCKET, objectKey, expirySeconds);
}

/** Presigned GET URL for downloads (1-hour expiry). */
export function presignedDownload(objectKey: string, expirySeconds = 60 * 60): Promise<string> {
  return minioClient.presignedGetObject(BUCKET, objectKey, expirySeconds);
}

export async function putObject(objectKey: string, buffer: Buffer, contentType: string): Promise<void> {
  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, { 'Content-Type': contentType });
}

export async function deleteObject(objectKey: string): Promise<void> {
  await minioClient.removeObject(BUCKET, objectKey);
}
