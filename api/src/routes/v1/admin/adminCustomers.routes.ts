/** Admin customers (PRD §8.12, §14). */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, paginated, parsePagination } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';

export const adminCustomersRoutes = Router();

adminCustomersRoutes.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const where: Record<string, unknown> = { role: 'customer' };
    if (req.query.search) where.OR = [
      { email: { contains: String(req.query.search), mode: 'insensitive' } },
      { firstName: { contains: String(req.query.search), mode: 'insensitive' } },
      { lastName: { contains: String(req.query.search), mode: 'insensitive' } },
    ];
    const [items, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, email: true, firstName: true, lastName: true, isActive: true, createdAt: true, _count: { select: { orders: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return paginated(res, items, { page, limit, totalCount });
  }),
);

adminCustomersRoutes.get(
  '/customers/:id',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 20, select: { orderNumber: true, totalAmount: true, status: true, createdAt: true } },
        quotes: { orderBy: { createdAt: 'desc' }, take: 20, select: { quoteRefNumber: true, quoteStatus: true, createdAt: true } },
      },
    });
    if (!user) throw AppError.notFound('CUSTOMER_NOT_FOUND', 'Customer not found.');
    const spent = await prisma.order.aggregate({ where: { userId: user.id, paymentStatus: 'paid' }, _sum: { totalAmount: true } });
    return ok(res, { ...user, passwordHash: undefined, totalSpent: Number(spent._sum.totalAmount ?? 0) });
  }),
);

adminCustomersRoutes.put(
  '/customers/:id/ban',
  validate(z.object({ reason: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) throw AppError.notFound('CUSTOMER_NOT_FOUND', 'Customer not found.');
    const updated = await prisma.user.update({ where: { id: user.id }, data: { isActive: !user.isActive, notes: req.body.reason } });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: user.isActive ? 'ban_customer' : 'unban_customer', entityType: 'user', entityId: user.id, newValue: { reason: req.body.reason }, ipAddress: req.ip } });
    return ok(res, { id: updated.id, isActive: updated.isActive });
  }),
);
