import { api } from './api';
import { REGIONS } from './utils';

interface CountryContext {
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
}

export async function resolveCurrency(region: string): Promise<string> {
  const fallback = REGIONS[region]?.currency ?? 'USD';
  try {
    const { data } = await api.get<CountryContext>('/countries/current', { country: region });
    return data?.currencyCode ?? fallback;
  } catch {
    return fallback;
  }
}
