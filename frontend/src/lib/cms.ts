/** CMS reads from the storefront. All endpoints fail-soft and fall back to static defaults. */
import { api } from './api';

export interface CmsBanner {
  id: number;
  placement: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
  tone: string | null;
  sortOrder: number;
  isActive: boolean;
}

export async function loadBanners(placement: string, region: string): Promise<CmsBanner[]> {
  try {
    const { data } = await api.get<CmsBanner[]>(`/banners?placement=${encodeURIComponent(placement)}`, { country: region });
    return data ?? [];
  } catch {
    return [];
  }
}

export interface CmsLegalSection {
  heading: string;
  paragraphs: string[];
}
export interface CmsLegalPage {
  slug: string;
  title: string;
  intro: string | null;
  heroImageUrl: string | null;
  sections: CmsLegalSection[];
  updatedLabel: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
}

export async function loadLegalPage(slug: string, region: string): Promise<CmsLegalPage | null> {
  try {
    const { data } = await api.get<CmsLegalPage>(`/legal/${encodeURIComponent(slug)}`, { country: region });
    return data ?? null;
  } catch {
    return null;
  }
}

export interface CmsTestimonial {
  id: number;
  name: string;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  quote: string;
  rating: number;
}

export async function loadTestimonials(region: string): Promise<CmsTestimonial[]> {
  try {
    const { data } = await api.get<CmsTestimonial[]>('/testimonials', { country: region });
    return data ?? [];
  } catch {
    return [];
  }
}

export interface SiteSettings {
  announcementBar: { enabled: boolean; items: string[] };
  contact: { phone: string; whatsapp: string; email: string; salesEmail: string; headquarters: string };
  trustBadges: { label: string; image?: string }[];
  footer: { description: string; social: Record<string, string>; certifications: string[] };
  offerPopup: { enabled: boolean; title: string; body: string; ctaLabel: string; ctaUrl: string; frequencyHours: number };
  localization?: { autoDetectCountry: boolean; defaultRegion: string; supportedLanguages: { code: string; label: string }[] };
  currencyDisplay?: { enabled: boolean; baseCurrency: string; marginPct: number; showBothCurrencies: boolean };
  pricingVisibility?: { regions: { slug: string; label: string; showPrice: boolean }[] };
}

/** Returns true if prices should be shown for the given region slug. Defaults to true if setting not configured. */
export function regionShowsPrice(settings: SiteSettings | null, regionSlug: string): boolean {
  const regions = settings?.pricingVisibility?.regions;
  if (!regions?.length) return true;
  const match = regions.find((r) => r.slug === regionSlug);
  return match ? match.showPrice : true;
}

export async function loadSiteSettings(): Promise<SiteSettings | null> {
  try {
    const { data } = await api.get<SiteSettings>('/settings/site');
    return data;
  } catch {
    return null;
  }
}
