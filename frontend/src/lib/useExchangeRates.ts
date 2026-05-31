'use client';

/**
 * Fetches live exchange rates from the API (cached 1 hr on the server, session-cached here).
 * Returns a convert() function: convert(amount, fromCurrency, toCurrency) → number.
 * If the currencyDisplay setting is disabled or rates aren't loaded yet, convert() is a no-op.
 */
import { useEffect, useState } from 'react';
import { api } from './api';

interface ExchangeRatePayload {
  enabled: boolean;
  baseCurrency: string;
  rates: Record<string, number>;
  marginPct: number;
  showBothCurrencies: boolean;
  fetchedAt: string;
}

interface UseExchangeRatesResult {
  rates: ExchangeRatePayload | null;
  convert: (amount: number | null, fromCurrency: string, toCurrency: string) => number | null;
  formatConverted: (amount: number | null, fromCurrency: string, toCurrency: string) => string | null;
}

// Module-level cache so it's fetched once per browser session across all components.
let cachedRates: ExchangeRatePayload | null = null;
let fetchPromise: Promise<ExchangeRatePayload | null> | null = null;

async function loadRates(): Promise<ExchangeRatePayload | null> {
  if (cachedRates) return cachedRates;
  if (fetchPromise) return fetchPromise;
  fetchPromise = api
    .get<ExchangeRatePayload>('/exchange-rates')
    .then((r) => {
      cachedRates = r.data;
      return cachedRates;
    })
    .catch(() => null);
  return fetchPromise;
}

export function useExchangeRates(): UseExchangeRatesResult {
  const [rates, setRates] = useState<ExchangeRatePayload | null>(cachedRates);

  useEffect(() => {
    if (cachedRates) { setRates(cachedRates); return; }
    void loadRates().then(setRates);
  }, []);

  function convert(amount: number | null, fromCurrency: string, toCurrency: string): number | null {
    if (amount == null) return null;
    if (!rates?.enabled) return amount;
    if (fromCurrency === toCurrency) return amount;
    const fromRate = rates.rates[fromCurrency.toUpperCase()];
    const toRate = rates.rates[toCurrency.toUpperCase()];
    if (!fromRate || !toRate) return amount;
    // fromCurrency → USD → toCurrency (margin already baked into rates)
    return (amount / fromRate) * toRate;
  }

  function formatConverted(amount: number | null, fromCurrency: string, toCurrency: string): string | null {
    const converted = convert(amount, fromCurrency, toCurrency);
    if (converted == null) return null;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: toCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(converted);
    } catch {
      return `${toCurrency} ${converted.toFixed(2)}`;
    }
  }

  return { rates, convert, formatConverted };
}

/** Map region subdomain slug → ISO 4217 currency code. */
export const REGION_CURRENCY: Record<string, string> = {
  ae: 'AED',
  ke: 'KES',
  de: 'EUR',
  global: 'USD',
};
