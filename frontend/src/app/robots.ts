import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/** robots.txt — disallow admin/auth/checkout/account/api paths from crawlers (PRD §18.3). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/admin/', '/api/', '/auth/', '/*/checkout/', '/*/account/', '/*/cart', '/*/quote-basket'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
