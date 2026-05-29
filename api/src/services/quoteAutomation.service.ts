import { prisma } from '../config/database';
import { pdfQueue } from '../config/bullmq';
import { logger } from '../config/logger';
import { round2 } from './pricing.service';

export interface QuoteAutomationConfig {
  enabled: boolean;
  autoSend: boolean;
  maxAutoValue: number;
  validityDays: number;
  discountTiers: { minQuantity: number; discountPercent: number }[];
}

const defaults: QuoteAutomationConfig = {
  enabled: true,
  autoSend: true,
  maxAutoValue: 50000,
  validityDays: 30,
  discountTiers: [
    { minQuantity: 100, discountPercent: 10 },
    { minQuantity: 25, discountPercent: 5 },
    { minQuantity: 10, discountPercent: 2 },
  ],
};

async function getConfig(): Promise<QuoteAutomationConfig> {
  const row = await prisma.setting.findUnique({ where: { key: 'quoteAutomation' } });
  const stored = (row?.value ?? {}) as Partial<QuoteAutomationConfig>;
  return { ...defaults, ...stored, discountTiers: stored.discountTiers ?? defaults.discountTiers };
}

function discountFor(quantity: number, tiers: QuoteAutomationConfig['discountTiers']): number {
  return [...tiers]
    .sort((left, right) => right.minQuantity - left.minQuantity)
    .find((tier) => quantity >= tier.minQuantity)?.discountPercent ?? 0;
}

export const quoteAutomationService = {
  defaults,

  getConfig,

  async tryAutoPriceAndSend(quoteId: number): Promise<void> {
    const config = await getConfig();
    if (!config.enabled) return;

    const quote = await prisma.bulkQuote.findUnique({
      where: { id: quoteId },
      include: { items: true },
    });
    if (!quote) return;

    const pricedItems = await Promise.all(
      quote.items.map(async (item) => {
        const price = await prisma.regionalInventoryPricing.findUnique({
          where: { productVariantId_countryId: { productVariantId: item.productVariantId, countryId: quote.countryId } },
        });
        if (!price?.isAvailable || price.retailPrice == null) return null;
        const discountPercent = discountFor(item.targetQuantity, config.discountTiers);
        const unitPrice = round2(Number(price.retailPrice) * (1 - discountPercent / 100));
        return { item, unitPrice, subtotal: round2(unitPrice * item.targetQuantity) };
      }),
    );

    if (pricedItems.some((item) => item == null)) {
      await prisma.bulkQuoteStatusHistory.create({
        data: { bulkQuoteId: quoteId, status: 'submitted', note: 'Automatic pricing skipped: an item requires manual pricing or availability review.' },
      });
      return;
    }

    const lines = pricedItems.filter((item): item is NonNullable<typeof item> => item != null);
    const total = round2(lines.reduce((sum, line) => sum + line.subtotal, 0));
    const mayAutoSend = config.autoSend && total <= config.maxAutoValue;
    const status: 'quotation_generating' | 'offered' = mayAutoSend ? 'quotation_generating' : 'offered';

    await prisma.$transaction([
      ...lines.map((line) =>
        prisma.bulkQuoteItem.update({
          where: { id: line.item.id },
          data: { offeredUnitPrice: line.unitPrice, offeredSubtotal: line.subtotal },
        }),
      ),
      prisma.bulkQuote.update({ where: { id: quoteId }, data: { totalOfferedValue: total, quoteStatus: status } }),
      prisma.bulkQuoteStatusHistory.create({
        data: {
          bulkQuoteId: quoteId,
          status,
          note: mayAutoSend ? 'Automatically priced; quotation delivery queued.' : 'Automatically priced; manual approval required before delivery.',
        },
      }),
    ]);

    if (mayAutoSend) {
      try {
        await pdfQueue.add('quote_invoice', { type: 'quote_invoice', id: quoteId }, { jobId: `quote-pdf-${quoteId}` });
      } catch (error) {
        await prisma.bulkQuote.update({ where: { id: quoteId }, data: { quoteStatus: 'delivery_failed' } });
        await prisma.bulkQuoteStatusHistory.create({
          data: { bulkQuoteId: quoteId, status: 'delivery_failed', note: 'Could not queue automatic quotation generation.' },
        });
        logger.error('automatic quote queue failed', { quoteId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  },
};
