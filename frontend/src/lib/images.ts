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

const PRODUCT_POOL = [
  '/img/products/catalog/explosion-proof-led-floodlight.jpg',
  '/img/products/catalog/mono-solar-panel-550.jpg',
  '/img/products/catalog/mcb-double-pole.jpg',
];

const CATEGORY_TO_PRODUCT: Record<string, string> = {
  'industrial-lighting':   '/img/products/catalog/explosion-proof-led-floodlight.jpg',
  'commercial-lighting':   '/img/products/catalog/commercial-led-panel.jpg',
  'solar-equipment':       '/img/products/catalog/mono-solar-panel-550.jpg',
  'cables-wiring':         '/img/products/catalog/xlpe-power-cable.jpg',
  'wiring-accessories':    '/img/products/catalog/ip68-cable-gland-kit.jpg',
  'power-control':         '/img/products/catalog/mcb-double-pole.jpg',
  'renewable-accessories': '/img/products/catalog/solar-mounting-rail.jpg',
  'deals':                 '/img/products/catalog/solar-rooftop-bundle.jpg',
};

export function categoryImage(slug: string): string {
  return CATEGORY_BY_SLUG[slug] ?? '/img/categories/industrial-lighting.svg';
}

/** Returns a product hero image. If the API has stored an image URL, prefer it; else pick by category. */
export function productImage(opts: { url?: string | null; categorySlug?: string; productId?: number }): string {
  if (opts.url && (opts.url.startsWith('http') || opts.url.startsWith('/'))) return opts.url;
  if (opts.categorySlug && CATEGORY_TO_PRODUCT[opts.categorySlug]) return CATEGORY_TO_PRODUCT[opts.categorySlug];
  // deterministic pseudo-random pick from pool by productId
  if (opts.productId != null) return PRODUCT_POOL[opts.productId % PRODUCT_POOL.length];
  return PRODUCT_POOL[0];
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
