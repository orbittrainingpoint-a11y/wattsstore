/**
 * Notification service — records a notification row and enqueues the email job on BullMQ.
 * API responses are never blocked on email delivery (PRD §2.3).
 */
import { prisma } from '../config/database';
import { emailQueue } from '../config/bullmq';
import { logger } from '../config/logger';

interface QueueEmailParams {
  template: string;
  recipient: string;
  subject: string;
  data: Record<string, unknown>;
  notificationType: string;
  userId?: number | null;
  referenceId?: number;
  referenceType?: string;
  attachments?: { filename: string; objectKey: string }[];
}

export const notificationService = {
  async queueEmail(params: QueueEmailParams, options?: { throwOnQueueFailure?: boolean }): Promise<number> {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId ?? null,
        channel: 'email',
        notificationType: params.notificationType,
        subject: params.subject,
        bodyPreview: `${params.template} → ${params.recipient}`,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
        status: 'pending',
      },
    });

    try {
      await emailQueue.add(
        params.template,
        {
          template: params.template,
          recipient: params.recipient,
          subject: params.subject,
          data: { ...params.data, notificationId: notification.id },
          notificationType: params.notificationType,
          referenceId: params.referenceId,
          referenceType: params.referenceType,
          attachments: params.attachments,
        },
        { jobId: `email-${notification.id}` },
      );
      logger.debug('Email queued', { template: params.template, recipient: params.recipient });
      return notification.id;
    } catch (err) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'failed', errorMessage: err instanceof Error ? err.message : String(err) },
      }).catch(() => undefined);
      logger.warn('Email enqueue failed', {
        template: params.template,
        error: err instanceof Error ? err.message : String(err),
      });
      if (options?.throwOnQueueFailure) throw err;
      return notification.id;
    }
  },
};
