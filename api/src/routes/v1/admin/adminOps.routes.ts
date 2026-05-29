/** Admin operations: notifications log, audit log, review moderation. */
import { Router } from 'express';
import { z } from 'zod';
import { opsService } from '../../../services/admin/ops.service';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, paginated, parsePagination } from '../../../utils/response';

export const adminOpsRoutes = Router();

// ── Notifications ──
adminOpsRoutes.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount, summary } = await opsService.listNotifications(
      {
        status: req.query.status as string | undefined,
        channel: req.query.channel as string | undefined,
        type: req.query.type as string | undefined,
        search: req.query.search as string | undefined,
      },
      skip,
      limit,
    );
    return paginated(res, items, { page, limit, totalCount }, { summary });
  }),
);

adminOpsRoutes.post(
  '/notifications/:id/resend',
  asyncHandler(async (req, res) => ok(res, await opsService.resendNotification(Number(req.params.id)))),
);

// ── Audit log ──
adminOpsRoutes.get(
  '/audit-log',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await opsService.listAuditLog(
      {
        entityType: req.query.entityType as string | undefined,
        entityId: req.query.entityId ? Number(req.query.entityId) : undefined,
        actorId: req.query.actorId ? Number(req.query.actorId) : undefined,
        action: req.query.action as string | undefined,
        from: req.query.from ? new Date(String(req.query.from)) : undefined,
        to: req.query.to ? new Date(String(req.query.to)) : undefined,
      },
      skip,
      limit,
    );
    return paginated(res, items, { page, limit, totalCount });
  }),
);

// ── Reviews moderation ──
adminOpsRoutes.get(
  '/reviews',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount, summary } = await opsService.listReviews(
      {
        status: req.query.status as string | undefined,
        productId: req.query.productId ? Number(req.query.productId) : undefined,
        search: req.query.search as string | undefined,
      },
      skip,
      limit,
    );
    return paginated(res, items, { page, limit, totalCount }, { summary });
  }),
);

adminOpsRoutes.put(
  '/reviews/:id/moderate',
  validate(z.object({ action: z.enum(['approve', 'reject']), reason: z.string().optional() })),
  asyncHandler(async (req, res) =>
    ok(res, await opsService.moderateReview(Number(req.params.id), req.body.action, req.user!.id, req.body.reason)),
  ),
);

adminOpsRoutes.put(
  '/reviews/:id/reply',
  validate(z.object({ reply: z.string().min(1).max(2000) })),
  asyncHandler(async (req, res) =>
    ok(res, await opsService.replyToReview(Number(req.params.id), req.body.reply, req.user!.id)),
  ),
);
