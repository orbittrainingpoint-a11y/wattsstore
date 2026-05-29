/** Cart routes (PRD §8.3). Auth required. */
import { Router } from 'express';
import { cartController } from '../../controllers/cart.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { addItemSchema, updateItemSchema, couponSchema } from '../../validators/cart.validator';

export const cartRoutes = Router();
cartRoutes.use(requireAuth);

cartRoutes.get('/', asyncHandler(cartController.get));
cartRoutes.post('/items', validate(addItemSchema), asyncHandler(cartController.addItem));
cartRoutes.put('/items/:variantId', validate(updateItemSchema), asyncHandler(cartController.updateItem));
cartRoutes.delete('/items/:variantId', asyncHandler(cartController.removeItem));
cartRoutes.delete('/', asyncHandler(cartController.clear));
cartRoutes.post('/coupon', validate(couponSchema), asyncHandler(cartController.applyCoupon));
cartRoutes.delete('/coupon', asyncHandler(cartController.removeCoupon));
