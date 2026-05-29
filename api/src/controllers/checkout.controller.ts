/** Checkout HTTP layer (PRD §8.4). */
import { Request, Response } from 'express';
import { checkoutService } from '../services/checkout.service';
import { ok } from '../utils/response';
import { env } from '../config/env';

export const checkoutController = {
  async shippingEstimate(req: Request, res: Response) {
    return ok(res, await checkoutService.shippingEstimate(req.user!.id, req.context));
  },

  async createOrder(req: Request, res: Response) {
    const result = await checkoutService.createOrder(req.user!.id, req.user!.email, req.context, {
      shipping: req.body.shipping,
      paymentGateway: req.body.paymentGateway,
      customerNotes: req.body.customerNotes,
      ip: req.ip,
    });
    return ok(res, result, 201);
  },

  async verifyShipping(req: Request, res: Response) {
    const orderNumber = await checkoutService.verifyShipping(req.params.token);
    return res.redirect(`${env.FRONTEND_URL}/account/orders/${orderNumber}?verified=true`);
  },
};
