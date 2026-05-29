/** Checkout routes (PRD §8.4). Order creation requires a verified email. */
import { Router } from 'express';
import { checkoutController } from '../../controllers/checkout.controller';
import { requireAuth, requireVerifiedEmail } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { createOrderSchema } from '../../validators/checkout.validator';

export const checkoutRoutes = Router();

checkoutRoutes.post('/shipping-estimate', requireAuth, asyncHandler(checkoutController.shippingEstimate));
checkoutRoutes.post(
  '/create-order',
  requireAuth,
  requireVerifiedEmail,
  validate(createOrderSchema),
  asyncHandler(checkoutController.createOrder),
);
checkoutRoutes.get('/verify-shipping/:token', asyncHandler(checkoutController.verifyShipping));
