/** Quote basket + RFQ routes (PRD §8.6). Mounted at both /quote and /quotes. Auth required. */
import { Router } from 'express';
import { quoteController } from '../../controllers/quote.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { addQuoteItemSchema, updateQuoteItemSchema, submitRFQSchema } from '../../validators/quote.validator';
import { z } from 'zod';
import { quoteMessageService } from '../../services/quoteMessage.service';
import { ok, created } from '../../utils/response';

export const quoteRoutes = Router();
quoteRoutes.use(requireAuth);

// Basket (Redis-backed)
quoteRoutes.get('/basket', asyncHandler(quoteController.getBasket));
quoteRoutes.post('/basket/items', validate(addQuoteItemSchema), asyncHandler(quoteController.addItem));
quoteRoutes.put('/basket/items/:variantId', validate(updateQuoteItemSchema), asyncHandler(quoteController.updateItem));
quoteRoutes.delete('/basket/items/:variantId', asyncHandler(quoteController.removeItem));
quoteRoutes.delete('/basket', asyncHandler(quoteController.clearBasket));

// Submission + history
quoteRoutes.post('/submit', validate(submitRFQSchema), asyncHandler(quoteController.submit));
quoteRoutes.get('/', asyncHandler(quoteController.list));
quoteRoutes.post('/:refNumber/accept', asyncHandler(quoteController.accept));
quoteRoutes.post('/:refNumber/reject', validate(z.object({ reason: z.string().min(1).max(500) })), asyncHandler(quoteController.reject));
quoteRoutes.get('/:refNumber/download', asyncHandler(quoteController.download));
quoteRoutes.get('/:refNumber/messages', asyncHandler(async (req, res) => ok(res, await quoteMessageService.listForCustomer(req.params.refNumber, req.user!.id))));
quoteRoutes.post(
  '/:refNumber/messages',
  validate(z.object({ message: z.string().min(1).max(2000) })),
  asyncHandler(async (req, res) => created(res, await quoteMessageService.createForCustomer(req.params.refNumber, req.user!.id, req.body.message))),
);
quoteRoutes.get('/:refNumber', asyncHandler(quoteController.detail));
