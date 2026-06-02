/** Customer order routes (PRD §8.4). Auth required for read/cancel; tracking is public-with-secret. */
import { Router } from 'express';
import { orderController } from '../../controllers/order.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import { orderService } from '../../services/order.service';
import { AppError } from '../../utils/AppError';
import { prisma } from '../../config/database';
import { presignedDownload } from '../../config/minio';
import { env } from '../../config/env';

export const orderRoutes = Router();

// Public tracking endpoint (no auth) — requires orderNumber + email pairing.
orderRoutes.get(
  '/track',
  asyncHandler(async (req, res) => {
    const ref = String(req.query.ref ?? '').trim();
    const email = String(req.query.email ?? '').trim();
    if (!ref || !email) throw AppError.badRequest('MISSING_PARAMS', 'Both ref and email are required.');
    return ok(res, await orderService.trackByEmail(ref, email));
  }),
);

// All other order routes require auth.
orderRoutes.use(requireAuth);
orderRoutes.get('/', asyncHandler(orderController.list));
orderRoutes.get('/:orderNumber', asyncHandler(orderController.detail));
orderRoutes.get(
  '/:orderNumber/invoice',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber }, select: { userId: true, invoiceUrl: true } });
    if (!order || order.userId !== req.user!.id) throw AppError.notFound('ORDER_NOT_FOUND', 'Order not found.');
    if (!order.invoiceUrl) throw AppError.notFound('INVOICE_NOT_READY', 'Invoice is not ready yet.');
    const invoiceHref = env.STORAGE_DRIVER === 'local' ? order.invoiceUrl : await presignedDownload(order.invoiceUrl);
    return res.redirect(invoiceHref);
  }),
);
orderRoutes.post('/:orderNumber/cancel', asyncHandler(orderController.cancel));
