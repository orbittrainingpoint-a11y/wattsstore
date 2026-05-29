/** Review routes (PRD §8.8). Submit + helpful vote require auth. */
import { Router } from 'express';
import { z } from 'zod';
import { reviewService } from '../../services/review.service';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';

const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional(),
  body: z.string().max(5000).optional(),
});

export const reviewRoutes = Router();

reviewRoutes.post(
  '/',
  requireAuth,
  validate(reviewSchema),
  asyncHandler(async (req, res) => created(res, await reviewService.submit(req.user!.id, req.body))),
);
reviewRoutes.post(
  '/:id/helpful',
  requireAuth,
  asyncHandler(async (req, res) => {
    await reviewService.voteHelpful(req.user!.id, Number(req.params.id));
    return ok(res, { voted: true });
  }),
);
