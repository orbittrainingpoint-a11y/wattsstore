/** Account (profile + addresses) and wishlist routes (PRD §8.5). Auth required. */
import { Router, Request, Response } from 'express';
import { accountService } from '../../services/account.service';
import { prisma } from '../../config/database';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created } from '../../utils/response';
import { updateProfileSchema, addressSchema, wishlistSchema } from '../../validators/account.validator';

export const accountRoutes = Router();
accountRoutes.use(requireAuth);

accountRoutes.get('/profile', asyncHandler(async (req, res) => ok(res, await accountService.getProfile(req.user!.id))));
accountRoutes.put(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => ok(res, await accountService.updateProfile(req.user!.id, req.body))),
);

accountRoutes.get('/addresses', asyncHandler(async (req, res) => ok(res, await accountService.listAddresses(req.user!.id))));
accountRoutes.post(
  '/addresses',
  validate(addressSchema),
  asyncHandler(async (req, res) => created(res, await accountService.addAddress(req.user!.id, req.body))),
);
accountRoutes.put(
  '/addresses/:id',
  validate(addressSchema),
  asyncHandler(async (req, res) => ok(res, await accountService.updateAddress(req.user!.id, Number(req.params.id), req.body))),
);
accountRoutes.delete(
  '/addresses/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await accountService.deleteAddress(req.user!.id, Number(req.params.id));
    return ok(res, { deleted: true });
  }),
);
accountRoutes.post(
  '/addresses/:id/default',
  asyncHandler(async (req, res) => {
    await accountService.setDefaultAddress(req.user!.id, Number(req.params.id));
    return ok(res, { isDefault: true });
  }),
);

// ── In-app notifications ──
accountRoutes.get(
  '/notifications/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, channel: 'in_app', status: 'sent', sentAt: null },
    });
    return ok(res, { count });
  }),
);
accountRoutes.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const items = await prisma.notification.findMany({
      where: { userId: req.user!.id, channel: 'in_app' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return ok(res, items);
  }),
);
// Mark notification read (sentAt = now signals "seen")
accountRoutes.put(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user!.id },
      data: { sentAt: new Date() },
    });
    return ok(res, { read: true });
  }),
);

// ── Wishlist (mounted separately at /wishlist) ──
export const wishlistRoutes = Router();
wishlistRoutes.use(requireAuth);

wishlistRoutes.get('/', asyncHandler(async (req, res) => ok(res, await accountService.listWishlist(req.user!.id, req.context.countryId))));
wishlistRoutes.post(
  '/',
  validate(wishlistSchema),
  asyncHandler(async (req, res) => created(res, await accountService.addWishlist(req.user!.id, req.body.productId))),
);
wishlistRoutes.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    await accountService.removeWishlist(req.user!.id, Number(req.params.productId));
    return ok(res, { removed: true });
  }),
);
