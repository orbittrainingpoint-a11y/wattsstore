/** BullMQ consumer: generates invoice PDFs (order or quote) via Puppeteer. */
import { Worker } from 'bullmq';
import { createBullConnection } from '../config/redis';
import { QUEUE_NAMES, PdfJob } from '../config/bullmq';
import { pdfService } from '../services/pdf.service';
import { logger } from '../config/logger';

export function startPdfWorker(): Worker<PdfJob> {
  const worker = new Worker<PdfJob>(
    QUEUE_NAMES.pdf,
    async (job) => {
      if (job.data.type === 'quote_invoice') return pdfService.generateQuoteInvoice(job.data.id);
      if (job.data.type === 'courier_receipt') return pdfService.generateCourierReceipt(job.data.id);
      return pdfService.generateOrderInvoice(job.data.id);
    },
    { connection: createBullConnection(), concurrency: 2 },
  );

  worker.on('completed', (job) => logger.info('pdf generated', { id: job.id, type: job.data.type }));
  worker.on('failed', (job, err) => logger.error('pdf failed', { id: job?.id, error: err.message }));
  return worker;
}
