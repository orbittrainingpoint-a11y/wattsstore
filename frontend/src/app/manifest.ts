import type { MetadataRoute } from 'next';

/** PWA manifest — makes WattsStore installable on Android & iOS. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WattsStore — Industrial Catalog',
    short_name: 'WattsStore',
    description: 'Industrial lighting, solar and power equipment across UAE, Kenya and Germany.',
    start_url: '/ae',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#1E4D8C',
    icons: [
      { src: '/img/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    categories: ['shopping', 'business', 'productivity'],
    shortcuts: [
      { name: 'Industrial Lighting', url: '/ae/categories/industrial-lighting' },
      { name: 'Solar Equipment',     url: '/ae/categories/solar-equipment' },
      { name: 'My Account',          url: '/ae/account' },
      { name: 'Quote Basket',        url: '/ae/quote-basket' },
    ],
  };
}
