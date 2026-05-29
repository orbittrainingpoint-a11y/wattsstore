/** Admin inventory matrix + manual adjustments (PRD §8.12, §14.5). */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { inventoryService } from '../../../services/inventory.service';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, paginated, parsePagination } from '../../../utils/response';

export const adminInventoryRoutes = Router();

adminInventoryRoutes.get(
  '/inventory',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const where: Record<string, unknown> = {};
    if (req.query.country) where.countryId = Number(req.query.country);
    if (req.query.status === 'available') where.isAvailable = true;
    if (req.query.status === 'hidden') where.isAvailable = false;
    if (req.query.search) {
      where.variant = {
        OR: [
          { variantSku: { contains: String(req.query.search), mode: 'insensitive' } },
          { product: { title: { contains: String(req.query.search), mode: 'insensitive' } } },
        ],
      };
    }
    if (req.query.categoryId) {
      where.variant = {
        ...(where.variant as Record<string, unknown> | undefined),
        product: { categoryId: Number(req.query.categoryId) },
      };
    }
    if (req.query.stock === 'out') {
      where.stockOnHand = { lte: 0 };
    }
    const [items, totalCount] = await Promise.all([
      prisma.regionalInventoryPricing.findMany({
        where,
        orderBy: { stockOnHand: 'asc' },
        skip,
        take: limit,
        include: { variant: { include: { product: { select: { title: true, categoryId: true, category: { select: { name: true } } } } } }, country: { select: { countryCode: true, currencyCode: true } } },
      }),
      prisma.regionalInventoryPricing.count({ where }),
    ]);
    const filtered = req.query.stock === 'low'
      ? items.filter((row) => Math.max(0, row.stockOnHand - row.stockReserved) <= row.stockLowThreshold && row.stockOnHand > 0)
      : req.query.stock === 'out'
        ? items.filter((row) => Math.max(0, row.stockOnHand - row.stockReserved) === 0)
        : items;
    return paginated(res, filtered, { page, limit, totalCount: req.query.stock === 'low' ? filtered.length : totalCount });
  }),
);

adminInventoryRoutes.put(
  '/inventory/:id',
  validate(
    z.object({
      retailPrice: z.number().nonnegative().optional(),
      compareAtPrice: z.number().nonnegative().nullable().optional(),
      costPrice: z.number().nonnegative().nullable().optional(),
      stockOnHand: z.number().int().nonnegative().optional(),
      stockReserved: z.number().int().nonnegative().optional(),
      stockLowThreshold: z.number().int().nonnegative().optional(),
      baseShippingCost: z.number().nonnegative().optional(),
      perKgAdder: z.number().nonnegative().optional(),
      isAvailable: z.boolean().optional(),
    }),
  ),
  asyncHandler(async (req, res) =>
    ok(res, await prisma.regionalInventoryPricing.update({ where: { id: Number(req.params.id) }, data: req.body })),
  ),
);

adminInventoryRoutes.get(
  '/inventory/:id/adjustments',
  asyncHandler(async (req, res) => {
    const row = await prisma.regionalInventoryPricing.findUnique({ where: { id: Number(req.params.id) } });
    if (!row) return ok(res, []);
    return ok(
      res,
      await prisma.inventoryAdjustment.findMany({
        where: { productVariantId: row.productVariantId, countryId: row.countryId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    );
  }),
);

adminInventoryRoutes.post(
  '/inventory/adjust',
  validate(
    z.object({
      variantId: z.number().int().positive(),
      countryId: z.number().int().positive(),
      type: z.enum(['received', 'returned', 'damaged', 'correction', 'transfer']),
      quantityDelta: z.number().int(),
      note: z.string().max(500).optional(),
    }),
  ),
  asyncHandler(async (req, res) =>
    ok(res, await inventoryService.adjustStock({ ...req.body, adjustedBy: req.user!.id })),
  ),
);
