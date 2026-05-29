/** BullMQ queue definitions. Producers import these; workers live in src/workers. */
import { Queue, QueueOptions } from 'bullmq';
import { createBullConnection } from './redis';

export const QUEUE_NAMES = {
  email: 'email-queue',
  pdf: 'pdf-queue',
  ai: 'ai-dispatch-queue',
} as const;

const defaultJobOptions: QueueOptions['defaultJobOptions'] = {
  removeOnComplete: 1000,
  removeOnFail: 5000,
};

export interface EmailJob {
  template: string;
  recipient: string;
  subject: string;
  data: Record<string, unknown>;
  attachments?: { filename: string; objectKey: string }[];
  notificationType?: string;
  referenceType?: string;
  referenceId?: number;
}

export interface PdfJob {
  type: 'order_invoice' | 'quote_invoice' | 'courier_receipt';
  id: number;
}

export interface AiJob {
  jobId: string;
  floorPlanUrl: string;
  countryId: number;
}

export const emailQueue = new Queue<EmailJob>(QUEUE_NAMES.email, {
  connection: createBullConnection(),
  defaultJobOptions: { ...defaultJobOptions, attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
});

export const pdfQueue = new Queue<PdfJob>(QUEUE_NAMES.pdf, {
  connection: createBullConnection(),
  defaultJobOptions: { ...defaultJobOptions, attempts: 2, backoff: { type: 'fixed', delay: 5000 } },
});

export const aiQueue = new Queue<AiJob>(QUEUE_NAMES.ai, {
  connection: createBullConnection(),
  defaultJobOptions: { ...defaultJobOptions, attempts: 2 },
});
