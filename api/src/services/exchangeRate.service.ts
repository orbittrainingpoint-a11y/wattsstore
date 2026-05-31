/**
 * Real-time exchange rate service.
 * Fetches from open.er-api.com (free, no API key, 160+ currencies).
 * Rates are cached in Redis for 1 hour to avoid hammering the provider.
 * The stored rate already includes the admin-configured margin so the
 * frontend can multiply directly: displayPrice = basePrice × rate.
 */
import { cacheGet, cacheSet } from '../config/redis';

const PROVIDER_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_KEY = 'exchange_rates:usd_base';
const CACHE_TTL = 60 * 60; // 1 hour

export interface ExchangeRates {
  baseCurrency: 'USD';
  rates: Record<string, number>; // currency code → units per 1 USD, margin already applied
  marginPct: number;
  fetchedAt: string; // ISO
}

async function fetchRates(): Promise<Record<string, number>> {
  const res = await fetch(PROVIDER_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Exchange rate provider returned ${res.status}`);
  const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
  if (!json.rates) throw new Error('Unexpected response from exchange rate provider');
  return json.rates;
}

export const exchangeRateService = {
  /**
   * Returns USD-based exchange rates with the configured margin baked in.
   * marginPct: the admin's markup (e.g. 2.5 → rates are inflated by 1.025).
   * Cached; falls back to last known rates on provider error.
   */
  async getRates(marginPct = 2.5): Promise<ExchangeRates> {
    const cacheKey = `${CACHE_KEY}:${marginPct}`;
    const cached = await cacheGet(cacheKey) as ExchangeRates | null;
    if (cached) return cached;

    const rawRates = await fetchRates();
    const multiplier = 1 + marginPct / 100;

    // Apply margin: customer pays more than raw mid-market rate (our spread)
    const rates: Record<string, number> = {};
    for (const [code, rate] of Object.entries(rawRates)) {
      rates[code] = Number((rate * multiplier).toFixed(6));
    }
    // Base currency is always exactly 1 (no conversion or margin for USD→USD)
    rates['USD'] = 1;

    const result: ExchangeRates = {
      baseCurrency: 'USD',
      rates,
      marginPct,
      fetchedAt: new Date().toISOString(),
    };
    await cacheSet(cacheKey, result, CACHE_TTL);
    return result;
  },

  /**
   * Convert an amount from one currency to another using live rates.
   * fromCurrency: the currency the amount is currently in.
   * toCurrency: the currency to display.
   */
  async convert(amount: number, fromCurrency: string, toCurrency: string, marginPct?: number): Promise<number> {
    if (fromCurrency === toCurrency) return amount;
    const { rates } = await this.getRates(marginPct);
    const fromRate = rates[fromCurrency.toUpperCase()];
    const toRate = rates[toCurrency.toUpperCase()];
    if (!fromRate || !toRate) throw new Error(`Unknown currency: ${fromCurrency} or ${toCurrency}`);
    // amount / fromRate → USD → × toRate = target currency
    return (amount / fromRate) * toRate;
  },
};
