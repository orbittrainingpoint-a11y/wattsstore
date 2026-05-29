/** Shipping + tax calculation (PRD §7.4, §11.4, §17.3). Pure functions where possible. */
import { prisma } from '../config/database';

export interface ShippableItem {
  baseShippingCost: number;
  perKgAdder: number;
  weightKg: number;
  quantity: number;
}

interface ShippingRateSettings {
  countryRates?: {
    countryCode: string;
    flatRate?: number;
    freeOver?: number;
    baseRate?: number;
    perKgRate?: number;
    estimatedDays?: string;
  }[];
}

interface TaxSettings {
  countryRates?: {
    countryCode: string;
    taxClass?: string;
    taxRate: number;
    taxLabel?: string;
    isInclusive?: boolean;
  }[];
}

export const pricingService = {
  /** order_shipping_total = Σ (base + weight×perKg) × qty. */
  async calculateShipping(items: ShippableItem[], countryId?: number, subtotal = 0): Promise<number> {
    if (countryId) {
      const country = await prisma.country.findUnique({ where: { id: countryId }, select: { countryCode: true } });
      const shippingSetting = await prisma.setting.findUnique({ where: { key: 'shippingRates' } });
      const settings = shippingSetting?.value as ShippingRateSettings | null;
      const rate = settings?.countryRates?.find((row) => row.countryCode.toUpperCase() === country?.countryCode);
      if (rate) {
        if (rate.freeOver != null && subtotal >= rate.freeOver) return 0;
        if (rate.flatRate != null) return round2(rate.flatRate);
        const weight = items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
        return round2((rate.baseRate ?? 0) + weight * (rate.perKgRate ?? 0));
      }
    }
    const total = items.reduce((sum, it) => {
      const perUnit = it.baseShippingCost + it.weightKg * it.perKgAdder;
      return sum + perUnit * it.quantity;
    }, 0);
    return round2(total);
  },

  /** Tax = taxable × (rate/100), unless the rule is price-inclusive. */
  async calculateTax(taxableAmount: number, countryId: number, taxClass = 'standard'): Promise<number> {
    const country = await prisma.country.findUnique({ where: { id: countryId }, select: { countryCode: true, vatRate: true } });
    const taxSetting = await prisma.setting.findUnique({ where: { key: 'taxSettings' } });
    const settings = taxSetting?.value as TaxSettings | null;
    const configured = settings?.countryRates?.find((row) =>
      row.countryCode.toUpperCase() === country?.countryCode && (row.taxClass ?? 'standard') === taxClass,
    );
    if (configured) return configured.isInclusive ? 0 : round2(taxableAmount * (configured.taxRate / 100));

    let rule = await prisma.taxRule.findUnique({
      where: { countryId_taxClass: { countryId, taxClass } },
    });
    rule ??= await prisma.taxRule.findUnique({
      where: { countryId_taxClass: { countryId, taxClass: 'standard' } },
    });
    if (!rule && country && Number(country.vatRate) > 0) return round2(taxableAmount * (Number(country.vatRate) / 100));
    if (!rule || rule.isInclusive) return 0;
    return round2(taxableAmount * (Number(rule.taxRate) / 100));
  },
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
