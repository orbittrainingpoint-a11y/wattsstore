/**
 * B2B RFQ system (PRD §13). Quote basket lives in Redis (`quote:{userId}`, 30-day TTL);
 * on submit it becomes a persisted bulk_quote. Sales agents then price + invoice.
 */
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { notificationService } from './notification.service';
import { quoteAutomationService } from './quoteAutomation.service';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { GeoContext } from '../types/express';
import { addDays } from 'date-fns';
import { orderRepository } from '../repositories/order.repository';
import { inventoryService } from './inventory.service';
import { presignedDownload } from '../config/minio';

const BASKET_TTL = 30 * 24 * 60 * 60;
const basketKey = (userId: number) => `quote:${userId}`;

export interface QuoteBasketItem {
  variantId: number;
  variantSku: string;
  productTitle: string;
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  targetQuantity: number;
  customerRemarks: string;
  addedAt: string;
}

interface QuoteBasketState {
  countryId: number;
  items: QuoteBasketItem[];
  updatedAt: string;
}

async function readBasket(userId: number): Promise<QuoteBasketState> {
  const raw = await redis.get(basketKey(userId));
  return raw ? (JSON.parse(raw) as QuoteBasketState) : { countryId: 0, items: [], updatedAt: new Date().toISOString() };
}

async function writeBasket(userId: number, state: QuoteBasketState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await redis.set(basketKey(userId), JSON.stringify(state), 'EX', BASKET_TTL);
}

export const quoteService = {
  async getBasket(userId: number) {
    return readBasket(userId);
  },

  async addItem(userId: number, geo: GeoContext, variantId: number, targetQuantity: number, customerRemarks = '') {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } },
    });
    if (!variant) throw AppError.notFound('VARIANT_NOT_FOUND', 'Product variant not found.');

    const state = await readBasket(userId);
    state.countryId = geo.countryId;
    const existing = state.items.find((i) => i.variantId === variantId);
    if (existing) {
      existing.targetQuantity = targetQuantity;
      existing.customerRemarks = customerRemarks;
    } else {
      state.items.push({
        variantId,
        variantSku: variant.variantSku,
        productTitle: variant.product.title,
        attributes: variant.attributes as Record<string, unknown>,
        imageUrl: variant.product.images[0]?.imageUrl ?? null,
        targetQuantity,
        customerRemarks,
        addedAt: new Date().toISOString(),
      });
    }
    await writeBasket(userId, state);
    return state;
  },

  async updateItem(userId: number, variantId: number, patch: { targetQuantity?: number; customerRemarks?: string }) {
    const state = await readBasket(userId);
    const item = state.items.find((i) => i.variantId === variantId);
    if (!item) throw AppError.notFound('ITEM_NOT_FOUND', 'Item not in quote basket.');
    if (patch.targetQuantity != null) item.targetQuantity = patch.targetQuantity;
    if (patch.customerRemarks != null) item.customerRemarks = patch.customerRemarks;
    await writeBasket(userId, state);
    return state;
  },

  async removeItem(userId: number, variantId: number) {
    const state = await readBasket(userId);
    state.items = state.items.filter((i) => i.variantId !== variantId);
    await writeBasket(userId, state);
    return state;
  },

  async clearBasket(userId: number) {
    await redis.del(basketKey(userId));
    return { countryId: 0, items: [], updatedAt: new Date().toISOString() } as QuoteBasketState;
  },

  /** Submit RFQ → bulk_quote + items; email sales team + customer; clear Redis basket (PRD §13.3). */
  async submitRFQ(
    userId: number,
    geo: GeoContext,
    form: {
      companyName: string;
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      trnTaxId?: string;
      deliveryLocation: string;
      urgencyLevel: string;
      additionalNotes?: string;
    },
  ) {
    const state = await readBasket(userId);
    if (!state.items.length) throw AppError.badRequest('QUOTE_EMPTY', 'Your quote basket is empty.');
    const quoteConfig = await quoteAutomationService.getConfig();

    const quote = await prisma.$transaction(async (tx) => {
      const refNumber = await this.generateRefNumber(tx, geo.countryCode);
      return tx.bulkQuote.create({
        data: {
          quoteRefNumber: refNumber,
          userId,
          countryId: geo.countryId,
          companyName: form.companyName,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          trnTaxId: form.trnTaxId,
          deliveryLocation: form.deliveryLocation,
          urgencyLevel: form.urgencyLevel,
          additionalNotes: form.additionalNotes,
          currencyCode: geo.currencyCode,
          expiresAt: addDays(new Date(), quoteConfig.validityDays),
          items: {
            create: state.items.map((it) => ({
              productVariantId: it.variantId,
              productTitle: it.productTitle,
              variantSku: it.variantSku,
              variantAttributes: it.attributes as object,
              targetQuantity: it.targetQuantity,
              customerRemarks: it.customerRemarks,
            })),
          },
          statusHistory: { create: { status: 'submitted', note: 'RFQ submitted by customer' } },
        },
      });
    });

    await this.clearBasket(userId);

    // Notify sales team + confirm to customer
    await notificationService.queueEmail({
      template: 'rfq-received-sales',
      recipient: env.SALES_TEAM_EMAIL,
      subject: `New RFQ ${quote.quoteRefNumber} — ${form.companyName}`,
      notificationType: 'rfq_received_sales',
      referenceId: quote.id,
      referenceType: 'bulk_quote',
      data: { refNumber: quote.quoteRefNumber, company: form.companyName, urgency: form.urgencyLevel },
    });
    await notificationService.queueEmail({
      template: 'rfq-received-customer',
      recipient: form.contactEmail,
      subject: `We received your quote request ${quote.quoteRefNumber}`,
      notificationType: 'rfq_received_customer',
      userId,
      referenceId: quote.id,
      referenceType: 'bulk_quote',
      data: { refNumber: quote.quoteRefNumber, contactName: form.contactName },
    });
    await quoteAutomationService.tryAutoPriceAndSend(quote.id);

    return { quoteRefNumber: quote.quoteRefNumber };
  },

  async generateRefNumber(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], countryCode: string): Promise<string> {
    const prefix = `WS-RFQ-${countryCode}-`;
    const last = await tx.bulkQuote.findFirst({
      where: { quoteRefNumber: { startsWith: prefix } },
      orderBy: { quoteRefNumber: 'desc' },
      select: { quoteRefNumber: true },
    });
    const lastSeq = last ? parseInt(last.quoteRefNumber.slice(prefix.length), 10) : 0;
    return `${prefix}${String(lastSeq + 1).padStart(6, '0')}`;
  },

  // ── Customer reads ──
  async listForUser(userId: number, skip: number, take: number) {
    const [items, totalCount] = await Promise.all([
      prisma.bulkQuote.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          quoteRefNumber: true,
          quoteStatus: true,
          companyName: true,
          totalOfferedValue: true,
          currencyCode: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.bulkQuote.count({ where: { userId } }),
    ]);
    return { items, totalCount };
  },

  async getForUser(refNumber: string, userId: number) {
    const quote = await prisma.bulkQuote.findUnique({
      where: { quoteRefNumber: refNumber },
      include: { items: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!quote || quote.userId !== userId) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    return quote;
  },

  async downloadForUser(refNumber: string, userId: number) {
    const quote = await prisma.bulkQuote.findFirst({ where: { quoteRefNumber: refNumber, userId } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (!quote.invoiceUrl) throw AppError.notFound('QUOTE_PDF_NOT_FOUND', 'Quotation PDF has not been generated yet.');
    const url = env.STORAGE_DRIVER === 'local' ? quote.invoiceUrl : await presignedDownload(quote.invoiceUrl, 10 * 60);
    return { url };
  },

  async accept(refNumber: string, userId: number) {
    return prisma.$transaction(async (tx) => {
      const quote = await tx.bulkQuote.findFirst({
        where: { quoteRefNumber: refNumber, userId },
        include: { country: true, items: { include: { variant: true } } },
      });
      if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
      if (quote.quoteStatus !== 'invoice_sent' || (quote.expiresAt && quote.expiresAt < new Date())) {
        throw AppError.conflict('QUOTE_NOT_ACCEPTABLE', 'This quotation cannot be accepted because it is not active.');
      }
      if (quote.totalOfferedValue == null) throw AppError.conflict('QUOTE_NOT_PRICED', 'This quotation has no offered total.');

      const claimed = await tx.bulkQuote.updateMany({
        where: { id: quote.id, quoteStatus: 'invoice_sent' },
        data: { quoteStatus: 'accepted' },
      });
      if (claimed.count !== 1) throw AppError.conflict('QUOTE_ALREADY_PROCESSED', 'This quotation has already been processed.');

      const orderNumber = await orderRepository.generateOrderNumber(tx, quote.country.countryCode);
      const nameParts = quote.contactName.trim().split(/\s+/);
      const firstName = nameParts.shift() || 'Business';
      const lastName = nameParts.join(' ') || 'Customer';
      const total = Number(quote.totalOfferedValue);
      for (const item of quote.items) {
        await inventoryService.reserveStock(tx, item.productVariantId, quote.countryId, item.targetQuantity);
      }
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          sourceBulkQuoteId: quote.id,
          countryId: quote.countryId,
          status: 'pending_payment',
          paymentStatus: 'unpaid',
          currencyCode: quote.currencyCode,
          subtotal: total,
          totalAmount: total,
          shippingFirstName: firstName.slice(0, 100),
          shippingLastName: lastName.slice(0, 100),
          shippingCompany: quote.companyName,
          shippingAddress1: quote.deliveryLocation.slice(0, 255),
          shippingCity: quote.country.countryName,
          shippingCountryCode: quote.country.countryCode,
          shippingPhone: quote.contactPhone,
          paymentGateway: 'bank_transfer',
          customerNotes: `Converted from quotation ${quote.quoteRefNumber}`,
          items: {
            create: quote.items.map((item) => ({
              productVariantId: item.productVariantId,
              productTitle: item.productTitle,
              variantSku: item.variantSku,
              variantAttributes: item.variantAttributes as object,
              unitPrice: item.offeredUnitPrice ?? 0,
              quantity: item.targetQuantity,
              subtotal: item.offeredSubtotal ?? 0,
              weightKg: item.variant.weightKg,
            })),
          },
          statusHistory: { create: { status: 'pending_payment', note: `Created from quotation ${quote.quoteRefNumber}` } },
        },
      });
      await tx.bulkQuoteStatusHistory.create({
        data: { bulkQuoteId: quote.id, status: 'accepted', note: `Accepted by customer and converted to order ${orderNumber}`, changedBy: userId },
      });
      return { orderNumber: order.orderNumber };
    });
  },

  async reject(refNumber: string, userId: number, reason: string) {
    const quote = await prisma.bulkQuote.findFirst({ where: { quoteRefNumber: refNumber, userId } });
    if (!quote) throw AppError.notFound('QUOTE_NOT_FOUND', 'Quote not found.');
    if (!['offered', 'quotation_generating', 'invoice_sent'].includes(quote.quoteStatus)) {
      throw AppError.conflict('QUOTE_NOT_REJECTABLE', 'This quotation cannot be rejected in its current state.');
    }
    await prisma.$transaction([
      prisma.bulkQuote.update({ where: { id: quote.id }, data: { quoteStatus: 'rejected' } }),
      prisma.bulkQuoteStatusHistory.create({ data: { bulkQuoteId: quote.id, status: 'rejected', note: reason, changedBy: userId } }),
    ]);
    return { quoteRefNumber: refNumber, status: 'rejected' };
  },
};
