/** Sales-agent personal dashboard KPIs (PRD §8.7). */
import { prisma } from '../../config/database';
import { startOfDay, startOfMonth, subDays } from 'date-fns';

export const salesAgentService = {
  /** Per-agent dashboard: claimed queue, month conversions, response time. */
  async dashboard(agentId: number) {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());

    const [
      openQueue,
      myClaimed,
      myOfferedThisMonth,
      myAcceptedThisMonth,
      myInvoicedThisMonth,
      avgOfferedValue,
      recentClaims,
    ] = await Promise.all([
      prisma.bulkQuote.count({ where: { quoteStatus: 'submitted' } }),
      prisma.bulkQuote.count({
        where: { assignedSalesAgentId: agentId, quoteStatus: { in: ['under_review', 'offered', 'invoice_sent'] } },
      }),
      prisma.bulkQuote.count({
        where: { assignedSalesAgentId: agentId, quoteStatus: 'offered', updatedAt: { gte: monthStart } },
      }),
      prisma.bulkQuote.count({
        where: { assignedSalesAgentId: agentId, quoteStatus: 'accepted', updatedAt: { gte: monthStart } },
      }),
      prisma.bulkQuote.count({
        where: { assignedSalesAgentId: agentId, quoteStatus: 'invoice_sent', invoiceSentAt: { gte: monthStart } },
      }),
      prisma.bulkQuote.aggregate({
        _avg: { totalOfferedValue: true },
        where: { assignedSalesAgentId: agentId, totalOfferedValue: { not: null }, updatedAt: { gte: subDays(new Date(), 90) } },
      }),
      prisma.bulkQuote.findMany({
        where: { assignedSalesAgentId: agentId },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          quoteRefNumber: true,
          companyName: true,
          quoteStatus: true,
          urgencyLevel: true,
          totalOfferedValue: true,
          currencyCode: true,
          updatedAt: true,
        },
      }),
    ]);

    const acceptRate =
      myOfferedThisMonth + myAcceptedThisMonth === 0
        ? 0
        : Math.round((myAcceptedThisMonth / (myOfferedThisMonth + myAcceptedThisMonth)) * 100);

    return {
      openQueue,
      myClaimed,
      myOfferedThisMonth,
      myAcceptedThisMonth,
      myInvoicedThisMonth,
      avgOfferedValue: Number(avgOfferedValue._avg.totalOfferedValue ?? 0),
      acceptRate,
      recentClaims,
      today,
    };
  },

  /** Per-agent monthly performance series. */
  async monthlySeries(agentId: number, months = 6) {
    type Row = { month: Date; offered: bigint; accepted: bigint; revenue: number };
    const since = subDays(new Date(), months * 30);
    return prisma.$queryRaw<Row[]>`
      SELECT date_trunc('month', updated_at) AS month,
             COUNT(*) FILTER (WHERE quote_status = 'offered')   AS offered,
             COUNT(*) FILTER (WHERE quote_status = 'accepted')  AS accepted,
             COALESCE(SUM(total_offered_value) FILTER (WHERE quote_status = 'accepted'), 0)::float8 AS revenue
      FROM bulk_quotes
      WHERE assigned_sales_agent_id = ${agentId}
        AND updated_at >= ${since}
      GROUP BY month
      ORDER BY month ASC;
    `;
  },
};
