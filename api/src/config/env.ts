/**
 * Zod-validated environment variables. Importing this module anywhere guarantees
 * the process has a fully validated, typed config — or it fails fast at boot.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const boolish = (def: 'true' | 'false') =>
  z
    .string()
    .default(def)
    .transform((v) => v === 'true' || v === '1')
    .pipe(z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  COOKIE_DOMAIN: z.string().default('localhost'),
  BCRYPT_COST: z.coerce.number().min(10).max(15).default(12),

  // Storage: 'local' writes uploads to disk (served via /uploads), 'minio' uses S3-compatible MinIO.
  STORAGE_DRIVER: z.enum(['local', 'minio']).default('local'),
  UPLOADS_DIR: z.string().default('./uploads'),
  UPLOADS_PUBLIC_PATH: z.string().default('/uploads'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: boolish('false'),
  MINIO_ACCESS_KEY: z.string().default('wattsstore'),
  MINIO_SECRET_KEY: z.string().default('wattsstore_dev_pw'),
  MINIO_BUCKET: z.string().default('wattsstore'),
  MINIO_PUBLIC_URL: z.string().default('http://localhost:9000'),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: boolish('false'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  MAIL_FROM: z.string().default('WattsStore <no-reply@wattsstore.com>'),
  SALES_TEAM_EMAIL: z.string().default('sales@wattsstore.com'),
  ADMIN_ALERT_EMAIL: z.string().default('admin@wattsstore.com'),

  STRIPE_SECRET_KEY: z.string().optional().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
  PAYTABS_PROFILE_ID: z.string().optional().default(''),
  PAYTABS_SERVER_KEY: z.string().optional().default(''),

  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_AUTH_WINDOW_MIN: z.coerce.number().default(15),
  RATE_LIMIT_API_MAX: z.coerce.number().default(300),
  RATE_LIMIT_API_WINDOW_MIN: z.coerce.number().default(1),

  COMPANY_NAME: z.string().default('WattsStore FZE'),
  COMPANY_ADDRESS: z.string().default('Dubai, United Arab Emirates'),
  COMPANY_TRN: z.string().default('100000000000003'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:');
  // eslint-disable-next-line no-console
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const corsOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
