/** Sales-agent RFQ workflow: claim, price line items, status, generate & send invoice (PRD §13.4). */
import { prisma } from '../config/database';
import { pdfQueue } from '../config/bullmq';
import { AppError } from '../utils/AppError';
import { round2 } from './pricing.service';
import { presignedDownload } from '../config/minio';

const URGENCY_ORDER: Record<string, number> = {
  immediate: 0,
  within_30_days: 1,
  within_60_days: 2,
  planning_phase: 3,
};

export const salesQuoteService = {
  async list(filters: { status?: string; countryId?: number; agentId?: number }, skip: number, take: number) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.quoteStatus = filters.status;
    if (filters.countryId) where.countryId = filters.countryId;
    if (filters.agentId) where.assignedSalesAgentId = filters.agentId;

    const [items, totalCount] = await Promise.all([
      prisma.bulkQuote.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }],
        skip,
        take,
        include: { _count: { select: { items: true } } },
      }),
      prisma.bulkQuote.count({ where }),
    ]);
    // Secondary sort by urgency in app layer (enum string order ≠ priority)
    items.sort((a, b) => (URGENCY_ORDER[a.urgencyLevel] ?? 9) - (URGENCY_ORDER[b.urgencyLevel] ?? 9));
    return { items, totalCount };
  },

  async getDetail(id: number) {
    const quote = await prisma.bulkQuote.findUnique({
      where: { id },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    return quote;
  },

  async download(id: number) {
    const quote = await prisma.bulkQuote.findUnique({ where: { id } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (!quote.invoiceUrl) throw AppError.notFound('QUOTE_PDF_NOT_FOUND', 'Quotation PDF has not been generated yet.');
    return { url: await presignedDownload(quote.invoiceUrl, 10 * 60) };
  },

  async claim(id: number, agentId: number) {
    const quote = await prisma.bulkQuote.findUnique({ where: { id } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (quote.assignedSalesAgentId && quote.assignedSalesAgentId !== agentId) {
      throw AppError.conflict('ALREADY_CLAIMED', 'This quote is already claimed by another agent.');
    }
    await prisma.bulkQuote.update({
      where: { id },
      data: { assignedSalesAgentId: agentId, quoteStatus: 'under_review' },
    });
    await prisma.bulkQuoteStatusHistory.create({
      data: { bulkQuoteId: id, status: 'under_review', note: 'Claimed by agent', changedBy: agentId },
    });
    return this.getDetail(id);
  },

  /** Set offered unit prices per line; recompute subtotals + total offered value. */
  async setPrices(id: number, items: { id: number; offeredUnitPrice: number }[], agentId: number) {
    const quote = await prisma.bulkQuote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (['quotation_generating', 'invoice_sent', 'accepted', 'rejected', 'expired'].includes(quote.quoteStatus)) {
      throw AppError.badRequest('PRICING_LOCKED', 'Pricing is locked after the invoice is sent.');
    }
    if (items.length !== quote.items.length || items.some((line) => !quote.items.some((item) => item.id === line.id))) {
      throw AppError.badRequest('INVALID_QUOTE_ITEMS', 'Pricing must include every line item from this quotation.');
    }

    let total = 0;
    await prisma.$transaction(
      items.map((line) => {
        const existing = quote.items.find((i) => i.id === line.id)!;
        const qty = existing.targetQuantity;
        const subtotal = round2(line.offeredUnitPrice * qty);
        total += subtotal;
        return prisma.bulkQuoteItem.update({
          where: { id: line.id },
          data: { offeredUnitPrice: line.offeredUnitPrice, offeredSubtotal: subtotal },
        });
      }),
    );
    await prisma.bulkQuote.update({
      where: { id },
      data: { totalOfferedValue: round2(total), quoteStatus: 'offered' },
    });
    await prisma.bulkQuoteStatusHistory.create({
      data: { bulkQuoteId: id, status: 'offered', note: 'Prices set by agent', changedBy: agentId },
    });
    return this.getDetail(id);
  },

  async updateStatus(id: number, status: string, note: string | undefined, agentId: number) {
    await prisma.bulkQuote.update({ where: { id }, data: { quoteStatus: status as never } });
    await prisma.bulkQuoteStatusHistory.create({
      data: { bulkQuoteId: id, status, note, changedBy: agentId },
    });
    return this.getDetail(id);
  },

  /** Lock pricing, status → invoice_sent, queue PDF generation job (worker emails it). */
  async generateInvoice(id: number, agentId: number) {
    const quote = await prisma.bulkQuote.findUnique({ where: { id } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (!quote.totalOfferedValue) throw AppError.badRequest('NOT_PRICED', 'Price all line items before invoicing.');

    if (['quotation_generating', 'invoice_sent', 'accepted', 'rejected', 'expired'].includes(quote.quoteStatus)) {
      throw AppError.conflict('QUOTE_DELIVERY_LOCKED', 'This quotation cannot be generated in its current state.');
    }
    await prisma.bulkQuote.update({ where: { id }, data: { quoteStatus: 'quotation_generating' } });
    await prisma.bulkQuoteStatusHistory.create({
      data: { bulkQuoteId: id, status: 'quotation_generating', note: 'Quotation PDF and email delivery queued', changedBy: agentId },
    });
    try {
      await pdfQueue.add('quote_invoice', { type: 'quote_invoice', id }, { jobId: `quote-pdf-${id}-${Date.now()}` });
    } catch {
      await prisma.bulkQuote.update({ where: { id }, data: { quoteStatus: 'delivery_failed' } });
      await prisma.bulkQuoteStatusHistory.create({
        data: { bulkQuoteId: id, status: 'delivery_failed', note: 'Failed to queue quotation generation', changedBy: agentId },
      });
      throw AppError.internal('Unable to queue the quotation for delivery.');
    }
    return { quoteRefNumber: quote.quoteRefNumber, status: 'quotation_generating' };
  },
};
