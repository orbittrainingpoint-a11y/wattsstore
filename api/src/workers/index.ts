/** Worker process entry point (PM2 `wattsstore-workers`). Boots all BullMQ consumers. */
import { connectDatabase } from '../config/database';
import { logger } from '../config/logger';
import { startEmailWorker } from './email.worker';
import { startPdfWorker } from './pdf.worker';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  const workers = [startEmailWorker(), startPdfWorker()];
  logger.info('WattsStore workers started: email, pdf');

  const shutdown = async () => {
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

bootstrap().catch((err) => {
  logger.error('Worker boot failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
