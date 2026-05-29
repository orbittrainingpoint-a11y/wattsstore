/** CLI dispatcher for cron jobs. Usage (system crontab): `ts-node src/cron/run.ts cleanup-carts`. */
import { cronJobs } from './jobs';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { logger } from '../config/logger';

const MAP: Record<string, () => Promise<void>> = {
  'cleanup-carts': cronJobs.cleanupCarts,
  'expire-coupons': cronJobs.expireCoupons,
  'expire-quotes': cronJobs.expireQuotes,
  'low-stock-report': cronJobs.lowStockReport,
};

async function main() {
  const jobName = process.argv[2];
  const job = jobName ? MAP[jobName] : undefined;
  if (!job) {
    logger.error(`Unknown cron job "${jobName}". Available: ${Object.keys(MAP).join(', ')}`);
    process.exit(1);
  }
  await connectDatabase();
  await job();
  await disconnectDatabase();
  process.exit(0);
}

main().catch((err) => {
  logger.error('cron run failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
