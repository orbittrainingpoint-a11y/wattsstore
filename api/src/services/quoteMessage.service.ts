import { prisma } from '../config/database';
import { AppError } from '../utils/AppError';

export const quoteMessageService = {
  async listForCustomer(refNumber: string, userId: number) {
    const quote = await prisma.bulkQuote.findFirst({ where: { quoteRefNumber: refNumber, userId }, select: { id: true } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    return this.list(quote.id, false);
  },

  async createForCustomer(refNumber: string, userId: number, message: string) {
    const quote = await prisma.bulkQuote.findFirst({ where: { quoteRefNumber: refNumber, userId }, select: { id: true } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    return this.create(quote.id, userId, 'customer', message, false);
  },

  async listForSales(quoteId: number, includeInternal = false) {
    const quote = await prisma.bulkQuote.findUnique({ where: { id: quoteId }, select: { id: true } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    return this.list(quoteId, includeInternal);
  },

  async createForSales(quoteId: number, userId: number, message: string, isInternal = false) {
    const quote = await prisma.bulkQuote.findUnique({ where: { id: quoteId }, select: { id: true } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    return this.create(quoteId, userId, isInternal ? 'internal' : 'sales', message, isInternal);
  },

  async list(quoteId: number, includeInternal: boolean) {
    return prisma.bulkQuoteMessage.findMany({
      where: { bulkQuoteId: quoteId, ...(includeInternal ? {} : { isInternal: false }) },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    });
  },

  async create(quoteId: number, senderId: number, senderRole: string, message: string, isInternal: boolean) {
    const clean = message.trim();
    if (!clean) throw AppError.badRequest('MESSAGE_REQUIRED', 'Message is required.', 'message');
    return prisma.bulkQuoteMessage.create({
      data: { bulkQuoteId: quoteId, senderId, senderRole, message: clean, isInternal },
      include: { sender: { select: { firstName: true, lastName: true, role: true } } },
    });
  },
};
