/** Admin promotions + coupons + brands (PRD §8 admin, §16). */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, created } from '../../../utils/response';
import { slugify } from '../../../utils/slugify';
import { cacheDel, cacheDelPattern } from '../../../config/redis';

export const adminMarketingRoutes = Router();

// ── Promotions ──
const promoSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discountValue: z.number().min(0),
  minOrderValue: z.number().min(0).optional(),
  appliesTo: z.enum(['all', 'specific_categories', 'specific_products']).optional(),
  applicableIds: z.array(z.number().int()).optional(),
  countryIds: z.array(z.number().int()).optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  isActive: z.boolean().optional(),
});
adminMarketingRoutes.get('/promotions', asyncHandler(async (_req, res) => ok(res, await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } }))));
adminMarketingRoutes.post('/promotions', validate(promoSchema), asyncHandler(async (req, res) => created(res, await prisma.promotion.create({ data: { ...req.body, startsAt: new Date(req.body.startsAt), endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null } }))));
adminMarketingRoutes.put('/promotions/:id', validate(promoSchema.partial()), asyncHandler(async (req, res) => ok(res, await prisma.promotion.update({ where: { id: Number(req.params.id) }, data: { ...req.body, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : undefined, endsAt: req.body.endsAt ? new Date(req.body.endsAt) : req.body.endsAt } }))));
adminMarketingRoutes.delete('/promotions/:id', asyncHandler(async (req, res) => { await prisma.promotion.update({ where: { id: Number(req.params.id) }, data: { isActive: false } }); return ok(res, { archived: true }); }));

// ── Coupons ──
const couponSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.toUpperCase()),
  description: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discountValue: z.number().min(0),
  minOrderValue: z.number().min(0).optional(),
  maxDiscountCap: z.number().min(0).nullable().optional(),
  usageLimitTotal: z.number().int().positive().nullable().optional(),
  usageLimitPerUser: z.number().int().positive().optional(),
  appliesTo: z.string().optional(),
  applicableIds: z.array(z.number().int()).optional(),
  countryIds: z.array(z.number().int()).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
});
adminMarketingRoutes.get('/coupons', asyncHandler(async (_req, res) => ok(res, await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }))));
adminMarketingRoutes.post('/coupons', validate(couponSchema), asyncHandler(async (req, res) => created(res, await prisma.coupon.create({ data: { ...req.body, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null, expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null } }))));
adminMarketingRoutes.put('/coupons/:id', validate(couponSchema.partial()), asyncHandler(async (req, res) => ok(res, await prisma.coupon.update({ where: { id: Number(req.params.id) }, data: { ...req.body, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : req.body.startsAt, expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : req.body.expiresAt } }))));
adminMarketingRoutes.get(
  '/coupons/:id/usage',
  asyncHandler(async (req, res) => {
    const usages = await prisma.couponUsage.findMany({ where: { couponId: Number(req.params.id) }, include: { user: { select: { email: true } }, order: { select: { orderNumber: true } } } });
    return ok(res, usages);
  }),
);

// ── Brands ──
const brandSchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().max(160).optional(),
  originCountry: z.string().max(100).optional(),
  description: z.string().optional(),
  logoUrl: z.string().max(500).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
adminMarketingRoutes.get('/brands', asyncHandler(async (_req, res) => ok(res, await prisma.brand.findMany({ orderBy: { sortOrder: 'asc' } }))));
adminMarketingRoutes.post('/brands', validate(brandSchema), asyncHandler(async (req, res) => { const b = await prisma.brand.create({ data: { ...req.body, slug: req.body.slug ?? slugify(req.body.name) } }); await cacheDelPattern('catalog:*'); return created(res, b); }));
adminMarketingRoutes.put('/brands/:id', validate(brandSchema.partial()), asyncHandler(async (req, res) => { const b = await prisma.brand.update({ where: { id: Number(req.params.id) }, data: req.body }); await cacheDel('catalog:category-tree'); return ok(res, b); }));
