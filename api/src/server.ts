/** HTTP server entry point (PM2 starts this). Boots dependencies then listens. */
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { ensureBucket } from './config/minio';

// Keep the HTTP server alive if a background dependency (e.g. the job queue backend)
// emits an unhandled rejection. Such errors are logged, not fatal to request serving.
process.on('unhandledRejection', (reason) => {
  logger.warn('Unhandled promise rejection (non-fatal)', {
    reason: reason instanceof Error ? reason.message : String(reason),
  });
});

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await ensureBucket().catch((e) => logger.warn('MinIO bucket init skipped', { error: e.message }));

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`WattsStore API listening on :${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal boot error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
