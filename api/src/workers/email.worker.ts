/** BullMQ consumer: renders + sends transactional emails, updates the notification row. */
import { Worker } from 'bullmq';
import { createBullConnection } from '../config/redis';
import { QUEUE_NAMES, EmailJob } from '../config/bullmq';
import { emailService } from '../services/email.service';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export function startEmailWorker(): Worker<EmailJob> {
  const worker = new Worker<EmailJob>(
    QUEUE_NAMES.email,
    async (job) => {
      const { template, recipient, subject, data, attachments, notificationType, referenceType, referenceId } = job.data;
      await emailService.send({ template, recipient, subject, data, attachments });
      const notificationId = (data as { notificationId?: number }).notificationId;
      if (notificationId) {
        await prisma.notification
          .update({ where: { id: notificationId }, data: { status: 'sent', sentAt: new Date() } })
          .catch(() => undefined);
      }
      if (referenceType === 'bulk_quote' && notificationType === 'rfq_invoice_ready' && referenceId) {
        await prisma.$transaction([
          prisma.bulkQuote.update({ where: { id: referenceId }, data: { quoteStatus: 'invoice_sent', invoiceSentAt: new Date() } }),
          prisma.bulkQuoteStatusHistory.create({ data: { bulkQuoteId: referenceId, status: 'invoice_sent', note: 'Quotation emailed to customer.' } }),
        ]);
      }
    },
    { connection: createBullConnection(), concurrency: 5 },
  );

  worker.on('completed', (job) => logger.debug('email sent', { id: job.id }));
  worker.on('failed', async (job, err) => {
    logger.error('email failed', { id: job?.id, error: err.message });
    const notificationId = (job?.data.data as { notificationId?: number } | undefined)?.notificationId;
    if (notificationId && job?.attemptsMade === job?.opts.attempts) {
      await prisma.notification.update({ where: { id: notificationId }, data: { status: 'failed', errorMessage: err.message } }).catch(() => undefined);
    }
    if (job?.data.referenceType === 'bulk_quote' && job.data.notificationType === 'rfq_invoice_ready' && job.data.referenceId && job?.attemptsMade === job?.opts.attempts) {
      await prisma.$transaction([
        prisma.bulkQuote.update({ where: { id: job.data.referenceId }, data: { quoteStatus: 'delivery_failed' } }),
        prisma.bulkQuoteStatusHistory.create({ data: { bulkQuoteId: job.data.referenceId, status: 'delivery_failed', note: 'Quotation email delivery failed after retries.' } }),
      ]).catch(() => undefined);
    }
  });
  return worker;
}
