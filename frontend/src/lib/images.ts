/**
 * Image registry — maps category/product slugs to local SVG illustrations.
 * Lets components render proper `<img>` content instead of emoji placeholders.
 * Returns a deterministic image even if the slug doesn't have a dedicated asset.
 */

const CATEGORY_BY_SLUG: Record<string, string> = {
  'industrial-lighting':     '/img/categories/industrial-lighting.svg',
  'commercial-lighting':     '/img/categories/commercial-lighting.svg',
  'solar-equipment':         '/img/categories/solar-equipment.svg',
  'wiring-accessories':      '/img/categories/wiring-accessories.svg',
  'power-control':           '/img/categories/power-control.svg',
  'cables-wiring':           '/img/categories/cables-wiring.svg',
  'renewable-accessories':   '/img/categories/renewable-accessories.svg',
  'deals':                   '/img/categories/deals.svg',
};

// Neutral placeholder used when a product has no uploaded image. Avoid showing random
// catalogue photos for products that don't actually have them — that confuses admins.
export const PRODUCT_IMAGE_PLACEHOLDER = '/img/illustrations/empty-state.svg';

export function categoryImage(slug: string): string {
  return CATEGORY_BY_SLUG[slug] ?? '/img/categories/industrial-lighting.svg';
}

/** Returns a product hero image. Uses the saved URL if present, otherwise a neutral placeholder. */
export function productImage(opts: { url?: string | null; categorySlug?: string; productId?: number }): string {
  if (opts.url && (opts.url.startsWith('http') || opts.url.startsWith('/'))) return opts.url;
  return PRODUCT_IMAGE_PLACEHOLDER;
}

export const HERO_IMAGES = {
  industrial: '/img/banners/cms/industrial-hero.jpg',
  solar:      '/img/banners/cms/solar-hero.jpg',
  b2b:        '/img/banners/cms/b2b-hero.jpg',
};

export const BANNER_IMAGES = {
  industrial: '/img/banners/cms/hazardous-lighting.jpg',
  solar:      '/img/banners/cms/solar-hero.jpg',
  b2b:        '/img/banners/cms/b2b-hero.jpg',
  wiring:     '/img/banners/cms/industrial-hero.jpg',
  power:      '/img/banners/cms/power-control.jpg',
  deals:      '/img/banners/cms/support-rfq.jpg',
};

export const TRUST_ICONS = {
  delivery:  '/img/trust/delivery.svg',
  warranty:  '/img/trust/warranty.svg',
  quote:     '/img/trust/quote.svg',
  certified: '/img/trust/certified.svg',
  secure:    '/img/trust/secure.svg',
  regions:   '/img/trust/regions.svg',
  returns:   '/img/trust/returns.svg',
  support:   '/img/trust/support.svg',
};

export const BLOG_IMAGES = {
  lighting: '/img/blog/lighting.svg',
  solar:    '/img/blog/solar.svg',
  b2b:      '/img/blog/b2b.svg',
};

export const SOCIAL_ICONS = {
  linkedin:  '/img/social/linkedin.svg',
  instagram: '/img/social/instagram.svg',
  youtube:   '/img/social/youtube.svg',
  whatsapp:  '/img/social/whatsapp.svg',
};

export const ACCOUNT_ICONS = {
  orders:    '/img/icons/orders.svg',
  quotes:    '/img/icons/quotes.svg',
  addresses: '/img/icons/addresses.svg',
  wishlist:  '/img/icons/wishlist.svg',
  profile:   '/img/icons/profile.svg',
  security:  '/img/icons/security.svg',
};

export const ILLUSTRATIONS = {
  notFound:   '/img/illustrations/not-found.svg',
  emptyCart:  '/img/illustrations/empty-cart.svg',
  emptyState: '/img/illustrations/empty-state.svg',
  contact:    '/img/illustrations/contact.svg',
};
