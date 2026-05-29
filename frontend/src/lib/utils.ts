import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind class merger. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const SYMBOL: Record<string, string> = { AED: 'AED', KES: 'KSh', EUR: '€', USD: '$' };

/** Format a price for the active currency. */
export function formatCurrency(amount: number | null, currency = 'AED'): string {
  if (amount == null) return 'Contact for Price';
  const symbol = SYMBOL[currency] ?? currency;
  return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Region segments → country code mapping for the API. */
export const REGIONS: Record<string, { code: string; name: string; currency: string }> = {
  ae: { code: 'AE', name: 'UAE', currency: 'AED' },
  ke: { code: 'KE', name: 'Kenya', currency: 'KES' },
  de: { code: 'DE', name: 'Germany', currency: 'EUR' },
  global: { code: 'US', name: 'Global', currency: 'USD' },
};

export const COUNTRY_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(REGIONS).map(([region, value]) => [value.code, region]),
);
