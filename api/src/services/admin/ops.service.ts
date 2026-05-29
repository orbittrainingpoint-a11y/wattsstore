/**
 * Admin "operations" services: notifications log, audit log, review moderation.
 * All thin Prisma read/write wrappers behind admin RBAC + audit trail.
 */
import { prisma } from '../../config/database';
import { emailQueue } from '../../config/bullmq';
import { AppError } from '../../utils/AppError';
import { logger } from '../../config/logger';

export const opsService = {
  // ───────── Notifications ─────────
  async listNotifications(filter: { status?: string; channel?: string; type?: string; search?: string }, skip: number, take: number) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.channel) where.channel = filter.channel;
    if (filter.type) where.notificationType = filter.type;
    if (filter.search) {
      where.OR = [
        { subject: { contains: filter.search, mode: 'insensitive' } },
        { bodyPreview: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const [items, totalCount, counts] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          userId: true,
          channel: true,
          notificationType: true,
          subject: true,
          bodyPreview: true,
          status: true,
          referenceId: true,
          referenceType: true,
          sentAt: true,
          createdAt: true,
          errorMessage: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const summary = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return { items, totalCount, summary };
  },

  /** Re-queue a previously-failed or pending notification. */
  async resendNotification(notificationId: number) {
    const n = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!n) throw AppError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found.');
    if (n.status === 'sent') throw AppError.badRequest('ALREADY_SENT', 'Notification already delivered.');
    try {
      await emailQueue.add(
        n.notificationType,
        {
          template: n.bodyPreview?.split(' → ')[0] ?? n.notificationType,
          recipient: n.bodyPreview?.split(' → ')[1] ?? '',
          subject: n.subject ?? '',
          data: { notificationId: n.id, referenceId: n.referenceId, referenceType: n.referenceType },
        },
        { jobId: `email-${n.id}-${Date.now()}` },
      );
      await prisma.notification.update({ where: { id: n.id }, data: { status: 'pending', errorMessage: null } });
      return { resent: true };
    } catch (err) {
      logger.warn('Resend enqueue failed', { id: n.id, error: err instanceof Error ? err.message : String(err) });
      throw AppError.internal('Could not re-queue notification (queue degraded).');
    }
  },

  // ───────── Audit log ─────────
  async listAuditLog(
    filter: { entityType?: string; entityId?: number; actorId?: number; action?: string; from?: Date; to?: Date },
    skip: number,
    take: number,
  ) {
    const where: Record<string, unknown> = {};
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId != null) where.entityId = filter.entityId;
    if (filter.actorId != null) where.actorId = filter.actorId;
    if (filter.action) where.action = { contains: filter.action, mode: 'insensitive' };
    if (filter.from || filter.to) {
      where.createdAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    const [items, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, totalCount };
  },

  // ───────── Review moderation ─────────
  async listReviews(filter: { status?: string; productId?: number; search?: string }, skip: number, take: number) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.productId) where.productId = filter.productId;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { body: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const [items, totalCount, counts] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
          product: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.productReview.count({ where }),
      prisma.productReview.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);
    const summary = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
    return { items, totalCount, summary };
  },

  async moderateReview(reviewId: number, action: 'approve' | 'reject', actorId: number, reason?: string) {
    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw AppError.notFound('REVIEW_NOT_FOUND', 'Review not found.');
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.productReview.update({
        where: { id: reviewId },
        data: { status: newStatus as 'approved' | 'rejected', adminNote: reason ?? null },
      });

      // Recompute rolling rating + reviewCount on the product for approved reviews.
      const agg = await tx.productReview.aggregate({
        where: { productId: review.productId, status: 'approved' },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.product.update({
        where: { id: review.productId },
        data: {
          reviewCount: agg._count._all,
          averageRating: agg._avg.rating ?? 0,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: `review.${action}`,
          entityType: 'product_review',
          entityId: reviewId,
          newValue: { status: newStatus, reason: reason ?? null, avgRating: agg._avg.rating ?? null },
        },
      });
      return updated;
    });
    return result;
  },

  async replyToReview(reviewId: number, reply: string, actorId: number) {
    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review) throw AppError.notFound('REVIEW_NOT_FOUND', 'Review not found.');
    await prisma.auditLog.create({
      data: {
        actorId,
        action: 'review.reply',
        entityType: 'product_review',
        entityId: reviewId,
        newValue: { reply },
      },
    });
    // adminNote re-purposed to store the admin reply (we keep moderation reason in newValue).
    return prisma.productReview.update({ where: { id: reviewId }, data: { adminNote: reply } });
  },
};
