/** Payment gateway webhooks (PRD §8.4, §11.5). Raw body preserved by app.ts json verify hook. */
import { Router, Request, Response } from 'express';
import { paymentService } from '../../services/payment.service';
import { orderService } from '../../services/order.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';

export const webhookRoutes = Router();

// Stripe — verify signature against raw body, then mark order paid.
webhookRoutes.post(
  '/payment/stripe',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.header('stripe-signature') ?? '';
    try {
      const event = paymentService.verifyStripeWebhook(req.rawBody!, signature);
      if (event.type === 'payment_intent.succeeded') {
        const intent = event.data.object as { id: string; metadata?: { orderNumber?: string } };
        const orderNumber = intent.metadata?.orderNumber;
        if (orderNumber) await orderService.markPaid(orderNumber, intent.id, intent as object);
      }
      res.json({ received: true });
    } catch (err) {
      logger.warn('Stripe webhook verification failed', { error: (err as Error).message });
      res.status(400).json({ success: false, error: { code: 'WEBHOOK_INVALID', message: 'Signature verification failed.' } });
    }
  }),
);

// PayTabs is fail-closed until its signed IPN verification is implemented.
webhookRoutes.post(
  '/payment/paytabs',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.warn('Rejected PayTabs webhook while signature verification is unavailable');
    res.status(503).json({ success: false, error: { code: 'PAYMENT_GATEWAY_UNAVAILABLE', message: 'PayTabs integration is not enabled.' } });
  }),
);
