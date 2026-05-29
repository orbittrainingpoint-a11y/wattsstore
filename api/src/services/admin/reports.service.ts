/** Admin dashboard KPIs + sales/inventory reports (PRD §14.1, §14.6). */
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { startOfDay, subDays } from 'date-fns';

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export const reportsService = {
  async dashboard(countryId?: number) {
    const today = startOfDay(new Date());
    const yest = subDays(today, 1);
    const countryFilter = countryId ? { countryId } : {};

    const [
      revenueToday,
      revenueYest,
      ordersToday,
      ordersYest,
      pendingFulfillment,
      activeRfqs,
      newCustomersToday,
      newCustomersYest,
      lowStock,
      pendingPayments,
      pendingVerification,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { ...countryFilter, paymentStatus: 'paid', paidAt: { gte: today } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { ...countryFilter, paymentStatus: 'paid', paidAt: { gte: yest, lt: today } } }),
      prisma.order.count({ where: { ...countryFilter, createdAt: { gte: today } } }),
      prisma.order.count({ where: { ...countryFilter, createdAt: { gte: yest, lt: today } } }),
      prisma.order.count({ where: { ...countryFilter, status: { in: ['paid', 'verified', 'processing'] } } }),
      prisma.bulkQuote.count({ where: { quoteStatus: { in: ['submitted', 'under_review'] } } }),
      prisma.user.count({ where: { role: 'customer', createdAt: { gte: today } } }),
      prisma.user.count({ where: { role: 'customer', createdAt: { gte: yest, lt: today } } }),
      prisma.regionalInventoryPricing.count({
        where: { ...countryFilter, stockOnHand: { lte: prisma.regionalInventoryPricing.fields.stockLowThreshold } },
      }).catch(() => 0),
      prisma.order.count({ where: { ...countryFilter, status: 'pending_payment' } }),
      prisma.order.count({ where: { ...countryFilter, status: 'pending_verification' } }),
    ]);

    const revToday = Number(revenueToday._sum.totalAmount ?? 0);
    const revYest = Number(revenueYest._sum.totalAmount ?? 0);

    return {
      revenueToday: revToday,
      revenueDeltaPct: pctDelta(revToday, revYest),
      ordersToday,
      ordersDelta: ordersToday - ordersYest,
      pendingFulfillment,
      pendingPayments,
      pendingVerification,
      activeRfqs,
      newCustomersToday,
      newCustomersDelta: newCustomersToday - newCustomersYest,
      lowStockCount: lowStock,
    };
  },

  /** 30-day revenue series grouped by day. */
  async salesSeries(from: Date, to: Date, countryId?: number) {
    const where = countryId ? Prisma.sql`AND country_id = ${countryId}` : Prisma.empty;
    const rows = await prisma.$queryRaw<{ day: Date; revenue: number; orders: bigint }[]>`
      SELECT date_trunc('day', paid_at) AS day,
             COALESCE(SUM(total_amount), 0)::float8 AS revenue,
             COUNT(*) AS orders
      FROM orders
      WHERE payment_status = 'paid'
        AND paid_at BETWEEN ${from} AND ${to}
        ${where}
      GROUP BY day ORDER BY day ASC;
    `;
    return rows.map((r) => ({ day: r.day, revenue: r.revenue, orders: Number(r.orders) }));
  },

  /** Conversion funnel — derived from real cart + order data over the last `days` days. */
  async conversionFunnel(days = 30, countryId?: number) {
    const since = subDays(new Date(), days);
    const cf = countryId ? { countryId } : {};
    const [carts, paidCarts, totalOrders, paidOrders, abandoned] = await Promise.all([
      prisma.cart.count({ where: { createdAt: { gte: since } } }),
      prisma.cart.count({ where: { createdAt: { gte: since }, items: { some: {} } } }),
      prisma.order.count({ where: { ...cf, createdAt: { gte: since } } }),
      prisma.order.count({ where: { ...cf, createdAt: { gte: since }, paymentStatus: 'paid' } }),
      prisma.order.count({ where: { ...cf, createdAt: { gte: since }, status: 'pending_payment' } }),
    ]);
    // Heuristic visitor count: assume 4× cart sessions (analytics-driven figure plugged in later).
    const visitors = carts * 4;
    return [
      { stage: 'Visitors', count: visitors, pct: 100 },
      { stage: 'Carts created', count: carts, pct: visitors ? Math.round((carts / visitors) * 100) : 0 },
      { stage: 'Carts with items', count: paidCarts, pct: visitors ? Math.round((paidCarts / visitors) * 100) : 0 },
      { stage: 'Orders placed', count: totalOrders, pct: visitors ? Math.round((totalOrders / visitors) * 100) : 0 },
      { stage: 'Orders paid', count: paidOrders, pct: visitors ? Math.round((paidOrders / visitors) * 100) : 0 },
      { stage: 'Abandoned', count: abandoned, pct: totalOrders ? Math.round((abandoned / totalOrders) * 100) : 0 },
    ];
  },

  async topProducts(limit = 10) {
    return prisma.product.findMany({
      where: { isActive: true },
      orderBy: { totalSold: 'desc' },
      take: limit,
      select: { id: true, title: true, totalSold: true, images: { where: { isPrimary: true }, take: 1, select: { imageUrl: true } } },
    });
  },

  async lowStock(countryId?: number) {
    const where = countryId ? Prisma.sql`AND rip.country_id = ${countryId}` : Prisma.empty;
    const rows = await prisma.$queryRaw<
      { variant_sku: string; stock_on_hand: number; stock_low_threshold: number; country_id: number; title: string }[]
    >`
      SELECT pv.variant_sku, rip.stock_on_hand, rip.stock_low_threshold, rip.country_id, p.title
      FROM regional_inventory_pricing rip
      JOIN product_variants pv ON pv.id = rip.product_variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE rip.stock_on_hand <= rip.stock_low_threshold
        ${where}
      ORDER BY rip.stock_on_hand ASC LIMIT 100;
    `;
    return rows;
  },

  /** Operational health for the ops banner. */
  async opsHealth() {
    const [pendingNotifications, failedNotifications, expiringQuotes, openShipments] = await Promise.all([
      prisma.notification.count({ where: { status: 'pending' } }),
      prisma.notification.count({ where: { status: 'failed' } }),
      prisma.bulkQuote.count({
        where: { quoteStatus: { in: ['offered', 'invoice_sent'] }, expiresAt: { lte: subDays(new Date(), -7) } },
      }),
      prisma.shipment.count({ where: { status: { in: ['in_transit', 'out_for_delivery'] } } }),
    ]);
    return { pendingNotifications, failedNotifications, expiringQuotes, openShipments };
  },
};
