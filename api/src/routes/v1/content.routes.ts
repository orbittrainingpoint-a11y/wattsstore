/** Blog / FAQ / community routes (PRD §8.9). Reads public; writes auth-gated + moderated. */
import { Router } from 'express';
import { z } from 'zod';
import { contentService } from '../../services/content.service';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok, created, paginated, parsePagination } from '../../utils/response';

export const contentRoutes = Router();

// ── Blog ──
contentRoutes.get(
  '/blog',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await contentService.listPosts(
      skip,
      limit,
      req.query.category as string | undefined,
      req.query.tag as string | undefined,
    );
    return paginated(res, items, { page, limit, totalCount });
  }),
);
contentRoutes.get('/blog/:slug', asyncHandler(async (req, res) => ok(res, await contentService.getPost(req.params.slug))));

// ── FAQ ──
contentRoutes.get('/faq', asyncHandler(async (_req, res) => ok(res, await contentService.getFaq())));

// ── Community ──
contentRoutes.get(
  '/community/threads',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await contentService.listThreads(skip, limit, req.query.category as string | undefined);
    return paginated(res, items, { page, limit, totalCount });
  }),
);
contentRoutes.get(
  '/community/threads/:slug',
  asyncHandler(async (req, res) => ok(res, await contentService.getThread(req.params.slug))),
);

const threadSchema = z.object({ title: z.string().min(5).max(255), body: z.string().min(10), category: z.string().max(100).optional() });
const replySchema = z.object({ body: z.string().min(1).max(5000) });

contentRoutes.post(
  '/community/threads',
  requireAuth,
  validate(threadSchema),
  asyncHandler(async (req, res) => created(res, await contentService.createThread(req.user!.id, req.body))),
);
contentRoutes.post(
  '/community/threads/:id/replies',
  requireAuth,
  validate(replySchema),
  asyncHandler(async (req, res) => created(res, await contentService.createReply(req.user!.id, Number(req.params.id), req.body.body))),
);
