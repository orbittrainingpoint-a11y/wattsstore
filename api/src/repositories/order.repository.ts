/** Prisma query layer for orders. */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const orderRepository = {
  /** Atomic per-country, per-year sequence → WS-AE-2025-000123. */
  async generateOrderNumber(tx: Prisma.TransactionClient, countryCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WS-${countryCode}-${year}-`;
    const last = await tx.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const lastSeq = last ? parseInt(last.orderNumber.slice(prefix.length), 10) : 0;
    return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
  },

  findByNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shipments: true,
        refunds: true,
      },
    });
  },

  findByVerificationToken(token: string) {
    return prisma.order.findUnique({ where: { shippingVerificationToken: token } });
  },

  listForUser(userId: number, skip: number, take: number) {
    return Promise.all([
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
          currencyCode: true,
          totalAmount: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where: { userId } }),
    ]);
  },

  addStatusHistory(orderId: number, status: string, note?: string, createdBy?: number) {
    return prisma.orderStatusHistory.create({ data: { orderId, status, note, createdBy } });
  },
};
