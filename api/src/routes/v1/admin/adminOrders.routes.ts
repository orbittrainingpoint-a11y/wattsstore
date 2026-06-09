/** Admin orders + RFQ override (PRD §8.12, §14.4). */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { orderService } from '../../../services/order.service';
import { orderRepository } from '../../../repositories/order.repository';
import { salesQuoteService } from '../../../services/salesQuote.service';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, paginated, parsePagination } from '../../../utils/response';
import { AppError } from '../../../utils/AppError';
import { presignedDownload } from '../../../config/minio';
import { env } from '../../../config/env';

export const adminOrdersRoutes = Router();
const orderStatusSchema = z.enum(['pending_payment', 'paid', 'pending_verification', 'verified', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']);
const quoteStatusSchema = z.enum(['under_review', 'offered', 'quotation_generating', 'invoice_sent', 'delivery_failed', 'accepted', 'rejected', 'expired']);

adminOrdersRoutes.get(
  '/orders',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const q = req.query;
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.paymentStatus) where.paymentStatus = q.paymentStatus;
    if (q.fulfillmentStatus) where.fulfillmentStatus = q.fulfillmentStatus;
    if (q.country) where.countryId = Number(q.country);
    if (q.dateFrom || q.dateTo) where.createdAt = { ...(q.dateFrom ? { gte: new Date(String(q.dateFrom)) } : {}), ...(q.dateTo ? { lte: new Date(String(q.dateTo)) } : {}) };
    if (q.search) where.orderNumber = { contains: String(q.search), mode: 'insensitive' };

    const [items, totalCount] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit, include: { _count: { select: { items: true } } } }),
      prisma.order.count({ where }),
    ]);
    return paginated(res, items, { page, limit, totalCount });
  }),
);

adminOrdersRoutes.get(
  '/orders/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: Number(req.params.id) },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } }, shipments: true, refunds: true },
    });
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    return ok(res, order);
  }),
);

adminOrdersRoutes.get(
  '/orders/:id/invoice',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { id: Number(req.params.id) }, select: { invoiceUrl: true } });
    if (!order?.invoiceUrl) throw AppError.notFound('INVOICE_NOT_READY', 'Invoice is not ready yet.');
    const invoiceHref = env.STORAGE_DRIVER === 'local' ? order.invoiceUrl : await presignedDownload(order.invoiceUrl);
    return res.redirect(invoiceHref);
  }),
);

adminOrdersRoutes.get(
  '/orders/:id/shipments/:shipmentId/receipt',
  asyncHandler(async (req, res) => {
    const shipment = await prisma.shipment.findFirst({
      where: { id: Number(req.params.shipmentId), orderId: Number(req.params.id) },
      select: { labelUrl: true },
    });
    if (!shipment?.labelUrl) throw AppError.notFound('RECEIPT_NOT_READY', 'Courier receipt is not ready yet.');
    const receiptHref = env.STORAGE_DRIVER === 'local' ? shipment.labelUrl : await presignedDownload(shipment.labelUrl);
    return res.redirect(receiptHref);
  }),
);

adminOrdersRoutes.put(
  '/orders/:id/status',
  validate(z.object({ status: orderStatusSchema, note: z.string().max(1000).optional() })),
  asyncHandler(async (req, res) => ok(res, { orderNumber: await orderService.updateStatus(Number(req.params.id), req.body.status, req.body.note, req.user!.id) })),
);

adminOrdersRoutes.post(
  '/orders/:id/shipment',
  validate(z.object({ carrier: z.string().min(1), trackingNumber: z.string().min(1), estimatedDelivery: z.string().optional() })),
  asyncHandler(async (req, res) =>
    ok(res, await orderService.addShipment(Number(req.params.id), { carrier: req.body.carrier, trackingNumber: req.body.trackingNumber, estimatedDelivery: req.body.estimatedDelivery ? new Date(req.body.estimatedDelivery) : undefined }, req.user!.id)),
  ),
);

// Admin manual override: mark shipping address as verified (bypasses customer email link).
// Required when email delivery is broken or the admin knows the address is correct.
adminOrdersRoutes.put(
  '/orders/:id/verify-shipping',
  asyncHandler(async (req, res) => {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        isShippingVerified: true,
        status: order.status === 'paid' ? 'verified' : order.status,
      },
    });
    await orderRepository.addStatusHistory(orderId, 'verified', 'Shipping address manually verified by admin', req.user!.id);
    return ok(res, updated);
  }),
);

adminOrdersRoutes.post(
  '/orders/:id/refund',
  validate(z.object({ amount: z.number().positive(), reason: z.string().min(1) })),
  asyncHandler(async (req, res) => ok(res, await orderService.processRefund(Number(req.params.id), req.body.amount, req.body.reason, req.user!.id))),
);

adminOrdersRoutes.put(
  '/orders/:id/admin-notes',
  validate(z.object({ adminNotes: z.string() })),
  asyncHandler(async (req, res) => ok(res, await prisma.order.update({ where: { id: Number(req.params.id) }, data: { adminNotes: req.body.adminNotes } }))),
);

// ── RFQ (admin view of all quotes + status override) ──
adminOrdersRoutes.get(
  '/rfq',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await salesQuoteService.list({ status: req.query.status as string | undefined }, skip, limit);
    return paginated(res, items, { page, limit, totalCount });
  }),
);
adminOrdersRoutes.put(
  '/rfq/:id/status',
  validate(z.object({ status: quoteStatusSchema, note: z.string().max(1000).optional() })),
  asyncHandler(async (req, res) => ok(res, await salesQuoteService.updateStatus(Number(req.params.id), req.body.status, req.body.note, req.user!.id))),
);
