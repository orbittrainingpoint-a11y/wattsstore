/** Admin content: blog, FAQ, banners, legal pages, community moderation (PRD §14). */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { cmsService } from '../../../services/cms.service';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, created } from '../../../utils/response';
import { slugify } from '../../../utils/slugify';
import { mediaService } from '../../../services/media.service';
import { testimonialService } from '../../../services/testimonial.service';

export const adminContentRoutes = Router();

// ── Blog ──
const blogSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().max(270).optional(),
  excerpt: z.string().optional(),
  body: z.string().min(1),
  coverImageUrl: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});
adminContentRoutes.get('/blog', asyncHandler(async (_req, res) => ok(res, await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } }))));
adminContentRoutes.post(
  '/blog',
  validate(blogSchema),
  asyncHandler(async (req, res) =>
    created(res, await prisma.blogPost.create({ data: { ...req.body, slug: req.body.slug ?? slugify(req.body.title), authorId: req.user!.id, tags: req.body.tags ?? [], publishedAt: req.body.status === 'published' ? new Date() : null } })),
  ),
);
adminContentRoutes.put('/blog/:id', validate(blogSchema.partial()), asyncHandler(async (req, res) => ok(res, await prisma.blogPost.update({ where: { id: Number(req.params.id) }, data: { ...req.body, publishedAt: req.body.status === 'published' ? new Date() : undefined } }))));
adminContentRoutes.delete('/blog/:id', asyncHandler(async (req, res) => { await prisma.blogPost.delete({ where: { id: Number(req.params.id) } }); return ok(res, { deleted: true }); }));

// ── FAQ ──
const faqSchema = z.object({
  categoryName: z.string().max(100).optional(),
  question: z.string().min(1).max(500),
  answer: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
adminContentRoutes.get('/faq', asyncHandler(async (_req, res) => ok(res, await prisma.faqEntry.findMany({ orderBy: [{ categoryName: 'asc' }, { sortOrder: 'asc' }] }))));
adminContentRoutes.post('/faq', validate(faqSchema), asyncHandler(async (req, res) => created(res, await prisma.faqEntry.create({ data: req.body }))));
adminContentRoutes.put('/faq/reorder',
  validate(z.object({ rows: z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })) })),
  asyncHandler(async (req, res) => {
    await prisma.$transaction(req.body.rows.map((r: { id: number; sortOrder: number }) => prisma.faqEntry.update({ where: { id: r.id }, data: { sortOrder: r.sortOrder } })));
    return ok(res, { reordered: req.body.rows.length });
  }),
);
adminContentRoutes.put('/faq/:id', validate(faqSchema.partial()), asyncHandler(async (req, res) => ok(res, await prisma.faqEntry.update({ where: { id: Number(req.params.id) }, data: req.body }))));
adminContentRoutes.delete('/faq/:id', asyncHandler(async (req, res) => { await prisma.faqEntry.delete({ where: { id: Number(req.params.id) } }); return ok(res, { deleted: true }); }));

// ── Banners ──
const bannerSchema = z.object({
  placement: z.enum(['home_hero', 'home_mosaic', 'home_strip', 'home_promo', 'about_cta', 'category', 'sidebar', 'pdp', 'promo']),
  eyebrow: z.string().max(80).optional().nullable(),
  title: z.string().max(150).optional().nullable(),
  subtitle: z.string().max(255).optional().nullable(),
  imageUrl: z.string().min(1).max(500),
  mobileImageUrl: z.string().max(500).optional().nullable(),
  linkUrl: z.string().max(500).optional().nullable(),
  ctaLabel: z.string().max(60).optional().nullable(),
  tone: z.string().max(20).optional().nullable(),
  countryIds: z.array(z.number().int()).optional(),
  sortOrder: z.number().int().optional(),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

adminContentRoutes.get(
  '/banners',
  asyncHandler(async (req, res) =>
    ok(res, await cmsService.listBanners({
      placement: req.query.placement as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
    })),
  ),
);
adminContentRoutes.put(
  '/banners/reorder',
  validate(z.object({ rows: z.array(z.object({ id: z.number().int(), sortOrder: z.number().int() })) })),
  asyncHandler(async (req, res) => ok(res, await cmsService.reorderBanners(req.body.rows))),
);
adminContentRoutes.get('/banners/:id', asyncHandler(async (req, res) => ok(res, await cmsService.getBanner(Number(req.params.id)))));
adminContentRoutes.post(
  '/banners',
  validate(bannerSchema),
  asyncHandler(async (req, res) =>
    created(res, await cmsService.createBanner({
      ...req.body,
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
    })),
  ),
);
adminContentRoutes.put(
  '/banners/:id',
  validate(bannerSchema.partial()),
  asyncHandler(async (req, res) =>
    ok(res, await cmsService.updateBanner(Number(req.params.id), {
      ...req.body,
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : req.body.startsAt,
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : req.body.endsAt,
    })),
  ),
);
adminContentRoutes.delete('/banners/:id', asyncHandler(async (req, res) => ok(res, await cmsService.deleteBanner(Number(req.params.id)))));

// ── Legal pages ──
const legalSchema = z.object({
  slug: z.string().min(1).max(60),
  title: z.string().min(1).max(150),
  intro: z.string().max(2000).optional().nullable(),
  heroImageUrl: z.string().max(500).optional().nullable(),
  sections: z.array(z.object({ heading: z.string().min(1).max(200), paragraphs: z.array(z.string()) })),
  updatedLabel: z.string().max(40).optional().nullable(),
  metaTitle: z.string().max(255).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  isPublished: z.boolean().optional(),
});

adminContentRoutes.get('/legal', asyncHandler(async (_req, res) => ok(res, await cmsService.listLegalPages())));
adminContentRoutes.get('/legal/:id', asyncHandler(async (req, res) => ok(res, await cmsService.getLegalPage(Number(req.params.id)))));
adminContentRoutes.post('/legal', validate(legalSchema), asyncHandler(async (req, res) => created(res, await cmsService.upsertLegalPage(req.body))));
adminContentRoutes.put('/legal/:id', validate(legalSchema), asyncHandler(async (req, res) => ok(res, await cmsService.upsertLegalPage(req.body))));
adminContentRoutes.delete('/legal/:id', asyncHandler(async (req, res) => ok(res, await cmsService.deleteLegalPage(Number(req.params.id)))));

// -- Media library --
const mediaRegisterSchema = z.object({
  url: z.string().min(1).max(700),
  storageKey: z.string().max(500).optional().nullable(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'application/octet-stream']),
  sizeBytes: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  altText: z.string().max(255).optional().nullable(),
  folder: z.enum(['banners', 'products', 'documents', 'blog', 'testimonials', 'legal', 'misc']).optional(),
  tags: z.array(z.string().max(40)).optional(),
});
adminContentRoutes.get(
  '/media',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const { items, totalCount } = await mediaService.list(
      { search: req.query.search as string | undefined, folder: req.query.folder as string | undefined },
      (page - 1) * limit,
      limit,
    );
    return res.json({ success: true, data: items, meta: { page, limit, totalCount, totalPages: Math.max(1, Math.ceil(totalCount / limit)) } });
  }),
);
const mimeEnum = z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'application/octet-stream']);
const folderEnum = z.enum(['banners', 'products', 'documents', 'blog', 'testimonials', 'legal', 'misc']);

adminContentRoutes.post(
  '/media/presign',
  validate(z.object({ filename: z.string().min(1).max(255), mimeType: mimeEnum, folder: folderEnum.optional() })),
  asyncHandler(async (req, res) => ok(res, await mediaService.presign(req.body))),
);
// One-shot upload — works with local disk OR MinIO. Client sends base64 file inside JSON.
// Use this when MinIO isn't available (STORAGE_DRIVER=local) or when avoiding presign hops.
adminContentRoutes.post(
  '/media/upload',
  validate(z.object({
    filename: z.string().min(1).max(255),
    mimeType: mimeEnum,
    folder: folderEnum.optional(),
    dataBase64: z.string().min(1),
    altText: z.string().max(255).nullable().optional(),
    tags: z.array(z.string()).optional(),
  })),
  asyncHandler(async (req, res) => created(res, await mediaService.uploadDirect(req.body, req.user!.id))),
);
adminContentRoutes.post(
  '/media',
  validate(mediaRegisterSchema),
  asyncHandler(async (req, res) => created(res, await mediaService.register(req.body, req.user!.id))),
);
adminContentRoutes.delete('/media/:id', asyncHandler(async (req, res) => ok(res, await mediaService.delete(Number(req.params.id)))));

// -- Testimonials --
const testimonialSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(150).optional().nullable(),
  company: z.string().max(150).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
  quote: z.string().min(1).max(2000),
  rating: z.number().min(1).max(5).optional(),
  countryIds: z.array(z.number().int()).optional(),
  sortOrder: z.number().int().optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
adminContentRoutes.get('/testimonials', asyncHandler(async (_req, res) => ok(res, await testimonialService.list())));
adminContentRoutes.post('/testimonials', validate(testimonialSchema), asyncHandler(async (req, res) => created(res, await testimonialService.create(req.body))));
adminContentRoutes.put('/testimonials/:id', validate(testimonialSchema.partial()), asyncHandler(async (req, res) => ok(res, await testimonialService.update(Number(req.params.id), req.body))));
adminContentRoutes.delete('/testimonials/:id', asyncHandler(async (req, res) => ok(res, await testimonialService.delete(Number(req.params.id)))));

// ── Community moderation ──
adminContentRoutes.get('/community/pending', asyncHandler(async (_req, res) => {
  const [threads, replies] = await Promise.all([
    prisma.forumThread.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } }),
    prisma.forumReply.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' } }),
  ]);
  return ok(res, { threads, replies });
}));
adminContentRoutes.put('/community/threads/:id', validate(z.object({ status: z.enum(['published', 'closed', 'removed']), isPinned: z.boolean().optional() })), asyncHandler(async (req, res) => ok(res, await prisma.forumThread.update({ where: { id: Number(req.params.id) }, data: req.body }))));
adminContentRoutes.put('/community/replies/:id', validate(z.object({ status: z.enum(['published', 'removed']) })), asyncHandler(async (req, res) => ok(res, await prisma.forumReply.update({ where: { id: Number(req.params.id) }, data: req.body }))));

// ── Review moderation (legacy entry point — primary lives in /admin/reviews via adminOps) ──
adminContentRoutes.get('/reviews/pending', asyncHandler(async (_req, res) => ok(res, await prisma.productReview.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, include: { product: { select: { title: true } } } }))));
adminContentRoutes.put(
  '/reviews/:id',
  validate(z.object({ status: z.enum(['approved', 'rejected']), adminNote: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const review = await prisma.productReview.update({ where: { id: Number(req.params.id) }, data: req.body });
    const agg = await prisma.productReview.aggregate({ where: { productId: review.productId, status: 'approved' }, _avg: { rating: true }, _count: true });
    await prisma.product.update({ where: { id: review.productId }, data: { averageRating: agg._avg.rating ?? 0, reviewCount: agg._count } });
    return ok(res, review);
  }),
);
