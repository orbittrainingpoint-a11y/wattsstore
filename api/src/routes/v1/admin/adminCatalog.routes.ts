/** Admin catalog CRUD (PRD §8.11). */
import { Router } from 'express';
import { z } from 'zod';
import { adminCatalogService } from '../../../services/admin/adminCatalog.service';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, created, paginated, parsePagination } from '../../../utils/response';

export const adminCatalogRoutes = Router();

const variantFieldSchema = z.object({
  field: z.string().min(1).max(60).regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers and underscores, starting with a letter.'),
  label: z.string().min(1).max(120),
  type: z.enum(['string', 'number', 'boolean']),
  required: z.boolean().optional(),
  options: z.array(z.string().min(1).max(80)).optional(),
  filterEnabled: z.boolean().optional(),
});

const categorySchema = z.object({
  name: z.string().min(1).max(150),
  slug: z.string().max(160).optional(),
  parentId: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
  variantSpecificationSchema: z.array(variantFieldSchema).max(20).optional(),
  showInMenu: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
});
const archiveCategorySchema = z.object({
  action: z.enum(['archive_only', 'archive_products', 'move_products']).default('archive_only'),
  targetCategoryId: z.number().int().positive().optional(),
});

// ── Categories ──
adminCatalogRoutes.get('/categories', asyncHandler(async (_req, res) => ok(res, await adminCatalogService.listCategories())));
adminCatalogRoutes.post('/categories', validate(categorySchema), asyncHandler(async (req, res) => created(res, await adminCatalogService.createCategory(req.body))));
adminCatalogRoutes.put('/categories/:id', validate(categorySchema.partial()), asyncHandler(async (req, res) => ok(res, await adminCatalogService.updateCategory(Number(req.params.id), req.body))));
adminCatalogRoutes.delete('/categories/:id', asyncHandler(async (req, res) => { await adminCatalogService.deleteCategory(Number(req.params.id)); return ok(res, { archived: true }); }));
adminCatalogRoutes.put('/categories/:id/archive', validate(archiveCategorySchema), asyncHandler(async (req, res) => ok(res, await adminCatalogService.archiveCategoryWithAction(Number(req.params.id), req.body.action, req.body.targetCategoryId))));
adminCatalogRoutes.put('/categories/:id/restore', asyncHandler(async (req, res) => ok(res, await adminCatalogService.restoreCategory(Number(req.params.id)))));
adminCatalogRoutes.get('/countries', asyncHandler(async (_req, res) => ok(res, await adminCatalogService.listCountries())));

// ── Products ──
const productSchema = z.object({
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive().optional(),
  skuBase: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  slug: z.string().max(270).optional(),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  keyFeatures: z.array(z.string().min(1).max(240)).max(20).optional(),
  brandOrigin: z.enum(['Indian', 'Chinese', 'German']).optional(),
  isPriceVisible: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isNewArrival: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  metaTitle: z.string().max(255).optional(),
  metaDescription: z.string().optional(),
  datasheetUrl: z.string().max(500).nullable().optional(),
  iesFileUrl: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

adminCatalogRoutes.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const [items, totalCount] = await adminCatalogService.listProducts(
      {
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        brandId: req.query.brandId ? Number(req.query.brandId) : undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
      },
      skip,
      limit,
    );
    return paginated(res, items, { page, limit, totalCount });
  }),
);
adminCatalogRoutes.get('/products/:id', asyncHandler(async (req, res) => ok(res, await adminCatalogService.getProduct(Number(req.params.id)))));
adminCatalogRoutes.get('/products/sku/next', asyncHandler(async (req, res) => ok(res, { skuBase: await adminCatalogService.generateSkuBase(Number(req.query.categoryId)) })));
adminCatalogRoutes.get('/products/:id/variants/next-sku', asyncHandler(async (req, res) => ok(res, { variantSku: await adminCatalogService.generateVariantSku(Number(req.params.id)) })));
adminCatalogRoutes.post('/products', validate(productSchema), asyncHandler(async (req, res) => created(res, await adminCatalogService.createProduct(req.body))));
adminCatalogRoutes.put('/products/:id', validate(productSchema.partial()), asyncHandler(async (req, res) => ok(res, await adminCatalogService.updateProduct(Number(req.params.id), req.body))));
adminCatalogRoutes.delete('/products/:id', asyncHandler(async (req, res) => { await adminCatalogService.deleteProduct(Number(req.params.id)); return ok(res, { archived: true }); }));
adminCatalogRoutes.put('/products/:id/restore', asyncHandler(async (req, res) => ok(res, await adminCatalogService.restoreProduct(Number(req.params.id)))));

// ── Variants ──
const variantSchema = z.object({
  variantSku: z.string().min(1).max(150),
  attributes: z.record(z.any()),
  weightKg: z.number().min(0).optional(),
  dimensions: z.object({ length_cm: z.number(), width_cm: z.number(), height_cm: z.number() }).partial().optional(),
  barcode: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
});
adminCatalogRoutes.post('/products/:id/variants', validate(variantSchema), asyncHandler(async (req, res) => created(res, await adminCatalogService.addVariant(Number(req.params.id), req.body))));
adminCatalogRoutes.put('/products/:id/variants/:variantId', validate(variantSchema.omit({ variantSku: true }).partial()), asyncHandler(async (req, res) => ok(res, await adminCatalogService.updateVariant(Number(req.params.variantId), req.body))));

// ── Regional pricing ──
const pricingSchema = z.object({
  retailPrice: z.number().min(0).nullable().optional(),
  compareAtPrice: z.number().min(0).nullable().optional(),
  costPrice: z.number().min(0).optional(),
  stockOnHand: z.number().int().min(0).optional(),
  stockLowThreshold: z.number().int().min(0).optional(),
  baseShippingCost: z.number().min(0).optional(),
  perKgAdder: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
  applyToAllCountries: z.boolean().optional(),
});
adminCatalogRoutes.put(
  '/products/:id/pricing/:countryId',
  validate(pricingSchema),
  asyncHandler(async (req, res) => ok(res, await adminCatalogService.setPricing(Number(req.params.id), Number(req.params.countryId), req.body))),
);

const documentSchema = z.object({
  title: z.string().min(1).max(150),
  fileUrl: z.string().min(1).max(700),
  fileType: z.enum(['datasheet', 'ies', 'catalogue', 'manual', 'certificate', 'other']),
  sortOrder: z.number().int().optional(),
});
adminCatalogRoutes.post('/products/:id/documents', validate(documentSchema), asyncHandler(async (req, res) => created(res, await adminCatalogService.addDocument(Number(req.params.id), req.body))));
adminCatalogRoutes.put('/products/:id/documents/:documentId', validate(documentSchema.partial()), asyncHandler(async (req, res) => ok(res, await adminCatalogService.updateDocument(Number(req.params.documentId), req.body))));
adminCatalogRoutes.delete('/products/:id/documents/:documentId', asyncHandler(async (req, res) => { await adminCatalogService.deleteDocument(Number(req.params.documentId)); return ok(res, { deleted: true }); }));

const productFaqSchema = z.object({
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(3000),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
adminCatalogRoutes.post('/products/:id/faqs', validate(productFaqSchema), asyncHandler(async (req, res) => created(res, await adminCatalogService.addFaq(Number(req.params.id), req.body))));
adminCatalogRoutes.put('/products/:id/faqs/:faqId', validate(productFaqSchema.partial()), asyncHandler(async (req, res) => ok(res, await adminCatalogService.updateFaq(Number(req.params.faqId), req.body))));
adminCatalogRoutes.delete('/products/:id/faqs/:faqId', asyncHandler(async (req, res) => { await adminCatalogService.deleteFaq(Number(req.params.faqId)); return ok(res, { deleted: true }); }));

// ── Images (presign + register + delete) ──
adminCatalogRoutes.post(
  '/products/:id/images/presign',
  validate(z.object({ mime: z.string() })),
  asyncHandler(async (req, res) => ok(res, await adminCatalogService.presignImage(Number(req.params.id), req.body.mime))),
);
adminCatalogRoutes.post(
  '/products/:id/images',
  validate(z.object({ imagePath: z.string(), altText: z.string().optional(), isPrimary: z.boolean().optional() })),
  asyncHandler(async (req, res) => created(res, await adminCatalogService.registerImage(Number(req.params.id), req.body.imagePath, req.body.altText, req.body.isPrimary))),
);
adminCatalogRoutes.delete(
  '/products/:id/images/:imageId',
  asyncHandler(async (req, res) => { await adminCatalogService.deleteImage(Number(req.params.id), Number(req.params.imageId)); return ok(res, { deleted: true }); }),
);
