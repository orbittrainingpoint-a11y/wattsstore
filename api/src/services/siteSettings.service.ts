import { prisma } from '../config/database';

export interface PublicSiteSettings {
  announcementBar: {
    enabled: boolean;
    items: string[];
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    salesEmail: string;
    headquarters: string;
  };
  trustBadges: { label: string; image?: string }[];
  footer: {
    description: string;
    social: Record<string, string>;
    certifications: string[];
  };
  offerPopup: {
    enabled: boolean;
    title: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
    frequencyHours: number;
  };
  localization: {
    autoDetectCountry: boolean;
    defaultRegion: string;
    supportedLanguages: { code: string; label: string }[];
  };
}

const defaults: PublicSiteSettings = {
  announcementBar: {
    enabled: true,
    items: ['Free Delivery on Qualifying Orders', 'Live Regional Product Catalog', 'Same-Day B2B Quote Response', 'ATEX / IECEx / CE Certified', 'UAE / Kenya / Germany Warehouses', '2-Year Manufacturer Warranty'],
  },
  contact: {
    phone: '+971 50 000 0000',
    whatsapp: '971500000000',
    email: 'hello@wattsstore.com',
    salesEmail: 'sales@wattsstore.com',
    headquarters: 'Dubai Free Zone, UAE',
  },
  trustBadges: [
    { label: 'Free Delivery', image: '/img/icons/delivery.svg' },
    { label: '2-Yr Warranty', image: '/img/icons/warranty.svg' },
    { label: 'B2B Quotes', image: '/img/icons/quote.svg' },
    { label: 'Certified', image: '/img/icons/certified.svg' },
    { label: 'Secure', image: '/img/icons/secure.svg' },
    { label: '4 Regions', image: '/img/icons/regions.svg' },
  ],
  footer: {
    description: 'Industrial electrical, lighting and solar equipment curated for engineers, MEP consultants and procurement teams.',
    social: {},
    certifications: ['ATEX', 'IECEx', 'CE', 'ISO9001'],
  },
  offerPopup: {
    enabled: false,
    title: 'Project pricing available',
    body: 'Request a formal quotation for bulk quantities and regional delivery support.',
    ctaLabel: 'Request Quote',
    ctaUrl: '/ae/quote-basket',
    frequencyHours: 24,
  },
  localization: {
    autoDetectCountry: true,
    defaultRegion: 'ae',
    supportedLanguages: [
      { code: 'en', label: 'English' },
      { code: 'ar', label: 'Arabic' },
      { code: 'fr', label: 'French' },
      { code: 'de', label: 'German' },
    ],
  },
};

export const PUBLIC_SETTING_KEYS = ['announcementBar', 'contact', 'trustBadges', 'footer', 'offerPopup', 'localization'] as const;

export const siteSettingsService = {
  async publicSettings(): Promise<PublicSiteSettings> {
    const rows = await prisma.setting.findMany({ where: { key: { in: [...PUBLIC_SETTING_KEYS] } } });
    const value = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Partial<PublicSiteSettings>;
    return {
      announcementBar: { ...defaults.announcementBar, ...(value.announcementBar ?? {}) },
      contact: { ...defaults.contact, ...(value.contact ?? {}) },
      trustBadges: (value.trustBadges as PublicSiteSettings['trustBadges'] | undefined) ?? defaults.trustBadges,
      footer: { ...defaults.footer, ...(value.footer ?? {}) },
      offerPopup: { ...defaults.offerPopup, ...(value.offerPopup ?? {}) },
      localization: { ...defaults.localization, ...(value.localization ?? {}) },
    };
  },

  defaults,
};
