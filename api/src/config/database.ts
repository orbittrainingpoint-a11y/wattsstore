/** Prisma client singleton. Reused across hot-reloads in dev to avoid connection leaks. */
import { PrismaClient } from '@prisma/client';
import { isProd } from './env';
import { logger } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: isProd ? ['warn', 'error'] : ['query', 'warn', 'error'],
  });

if (!isProd) global.__prisma = prisma;

export async function connectDatabase(): Promise<void> {
  await prisma.$connect();
  logger.info('PostgreSQL connected via Prisma');
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
