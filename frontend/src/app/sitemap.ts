import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const REGIONS = ['ae', 'ke', 'de', 'global'];
const CATEGORIES = ['industrial-lighting', 'commercial-lighting', 'solar-equipment', 'wiring-accessories', 'power-control', 'cables-wiring', 'renewable-accessories', 'deals'];
const PUBLIC_PAGES = ['', 'about', 'contact', 'brands', 'blog', 'faq', 'shipping-policy', 'returns-policy', 'privacy-policy', 'terms-of-service', 'solar-planner', 'track-order', 'community'];

/** sitemap.xml — covers every region × public page × category. PRD §18.3. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [];
  for (const r of REGIONS) {
    for (const p of PUBLIC_PAGES) {
      const path = p ? `${r}/${p}` : r;
      out.push({ url: `${BASE}/${path}`, lastModified: now, changeFrequency: 'weekly', priority: p === '' ? 1.0 : 0.7 });
    }
    for (const c of CATEGORIES) {
      out.push({ url: `${BASE}/${r}/categories/${c}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
    }
  }
  return out;
}
