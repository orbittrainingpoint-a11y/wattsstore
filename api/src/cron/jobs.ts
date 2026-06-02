/** Scheduled maintenance jobs (PRD §20.5). Run via system crontab → `cron/run.ts <jobName>`. */
import { prisma } from '../config/database';
import { notificationService } from '../services/notification.service';
import { logger } from '../config/logger';
import { env } from '../config/env';

export const cronJobs = {
  /** 02:00 — delete expired guest carts. */
  async cleanupCarts() {
    const { count } = await prisma.cart.deleteMany({ where: { userId: null, expiresAt: { lt: new Date() } } });
    logger.info('cron:cleanup-carts', { deleted: count });
  },

  /** 00:00 — deactivate coupons past expiry. */
  async expireCoupons() {
    const { count } = await prisma.coupon.updateMany({
      where: { isActive: true, expiresAt: { lt: new Date() } },
      data: { isActive: false },
    });
    logger.info('cron:expire-coupons', { deactivated: count });
  },

  /** 01:00 — mark RFQs past validity as expired. */
  async expireQuotes() {
    const { count } = await prisma.bulkQuote.updateMany({
      where: { quoteStatus: { in: ['offered', 'invoice_sent'] }, expiresAt: { lt: new Date() } },
      data: { quoteStatus: 'expired' },
    });
    logger.info('cron:expire-quotes', { expired: count });
  },

  /** 06:00 — email admin a low-stock digest. */
  async lowStockReport() {
    const rows = await prisma.$queryRaw<{ title: string; variant_sku: string; stock_on_hand: number }[]>`
      SELECT p.title, pv.variant_sku, rip.stock_on_hand
      FROM regional_inventory_pricing rip
      JOIN product_variants pv ON pv.id = rip.product_variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE rip.stock_on_hand <= rip.stock_low_threshold
      ORDER BY rip.stock_on_hand ASC LIMIT 200;`;
    if (rows.length) {
      await notificationService.queueEmail({
        template: 'low-stock-report',
        recipient: env.ADMIN_ALERT_EMAIL,
        subject: `Low stock alert — ${rows.length} variant(s) below threshold`,
        notificationType: 'low_stock_report',
        data: { itemCount: rows.length, rows },
      });
    }
    logger.info('cron:low-stock-report', { lowStockCount: rows.length });
  },
};
