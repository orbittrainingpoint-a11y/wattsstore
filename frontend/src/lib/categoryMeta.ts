/**
 * Per-category copy/imagery/sub-category tiles + brand list shown in the PLP hero & rails.
 * Falls back to a generic block when no entry exists for the slug.
 */
export interface CategoryMeta {
  hero: { eyebrow: string; tagline: string; bullet: string[]; gradient: string; icon: string };
  subCategories: { slug: string; name: string; icon: string; count: string }[];
  popularBrands: { name: string; initial: string; origin: 'Indian' | 'Chinese' | 'German' }[];
  buyersGuide: { title: string; points: { title: string; body: string }[] };
  faq: { q: string; a: string }[];
}

const SHARED_FAQ = [
  { q: 'Where do I find product documentation?', a: 'Documents appear on the product page where they have been uploaded. Contact sales before ordering when a required document is not listed.' },
  { q: 'Can I request pricing for a project quantity?', a: 'Yes. Add variants to the quote basket and submit quantities and delivery details for a formal quotation.' },
  { q: 'How do I check regional availability?', a: 'Available variants and regional pricing are displayed in the live catalog; final delivery timing is confirmed during checkout or quotation.' },
  { q: 'How are compliance requirements handled?', a: 'Review the listed specifications and available documents, then ask sales to confirm any project-specific compliance requirement.' },
];

export const CATEGORY_META: Record<string, CategoryMeta> = {
  'industrial-lighting': {
    hero: {
      eyebrow: 'Industrial Lighting',
      tagline: 'Industrial Lighting engineered for the harshest environments',
      bullet: ['Explosion-proof Zone 1/2 luminaires', 'IP66 / IP68 floodlights & high-bays', 'Emergency, tunnel & street lighting'],
      gradient: 'from-amber-500 via-yellow-500 to-orange-500',
      icon: '💡',
    },
    subCategories: [
      { slug: 'explosion-proof', name: 'Explosion-Proof', icon: '⚠️', count: '180+' },
      { slug: 'floodlights', name: 'Floodlights', icon: '🔦', count: '240+' },
      { slug: 'high-bay', name: 'High-Bay LED', icon: '🏭', count: '160+' },
      { slug: 'linear', name: 'Linear Lights', icon: '➖', count: '90+' },
      { slug: 'panel', name: 'Panel Lights', icon: '🪟', count: '120+' },
      { slug: 'street', name: 'Street Lights', icon: '🛣️', count: '110+' },
      { slug: 'tunnel', name: 'Tunnel Lights', icon: '🚇', count: '60+' },
      { slug: 'emergency', name: 'Emergency', icon: '🚨', count: '80+' },
    ],
    popularBrands: [
      { name: 'Wipro Lighting', initial: 'W', origin: 'Indian' },
      { name: 'Philips', initial: 'P', origin: 'German' },
      { name: 'Havells', initial: 'H', origin: 'Indian' },
      { name: 'CHINT', initial: 'C', origin: 'Chinese' },
      { name: 'Crompton', initial: 'CG', origin: 'Indian' },
      { name: 'Siemens', initial: 'S', origin: 'German' },
    ],
    buyersGuide: {
      title: 'Choosing the Right Industrial Luminaire',
      points: [
        { title: 'Match IP rating to environment', body: 'IP65 for outdoor general use, IP66 for high-pressure wash-down, IP67/68 for submersion. Always upgrade one tier when in doubt.' },
        { title: 'Check required certifications', body: 'For regulated installations, verify the exact variant documentation and site requirements before purchase.' },
        { title: 'Lumen output, not just wattage', body: 'A 100W LED can output 13,000–16,000 lumens depending on driver and optics. Compare lm/W (efficacy) — anything below 100 lm/W is yesterday\'s spec.' },
        { title: 'Driver quality determines lifespan', body: 'Mean Well, Tridonic or Philips drivers add cost but extend life from 30,000h to 60,000h+ and survive voltage swings common in industrial sites.' },
      ],
    },
    faq: SHARED_FAQ,
  },
  'solar-equipment': {
    hero: {
      eyebrow: 'Tier-1 Modules · Hybrid Inverters · Lithium',
      tagline: 'Solar Equipment for rooftop, off-grid and utility-scale projects',
      bullet: ['Mono / bifacial panels 400–600Wp', 'Hybrid + grid-tie inverters 3–100kW', 'Lithium banks, mounting & monitoring'],
      gradient: 'from-orange-500 via-amber-500 to-yellow-400',
      icon: '☀️',
    },
    subCategories: [
      { slug: 'solar-panels', name: 'Solar Panels', icon: '🌞', count: '420+' },
      { slug: 'inverters', name: 'Inverters', icon: '🔋', count: '180+' },
      { slug: 'batteries', name: 'Batteries', icon: '🔌', count: '140+' },
      { slug: 'mounting', name: 'Mounting Systems', icon: '🔩', count: '95+' },
      { slug: 'controllers', name: 'Charge Controllers', icon: '⚙️', count: '70+' },
      { slug: 'off-grid', name: 'Off-Grid Kits', icon: '📦', count: '40+' },
    ],
    popularBrands: [
      { name: 'Tata Power Solar', initial: 'T', origin: 'Indian' },
      { name: 'LONGi', initial: 'L', origin: 'Chinese' },
      { name: 'JA Solar', initial: 'JA', origin: 'Chinese' },
      { name: 'SMA', initial: 'SMA', origin: 'German' },
      { name: 'Fronius', initial: 'F', origin: 'German' },
      { name: 'Waaree', initial: 'W', origin: 'Indian' },
    ],
    buyersGuide: {
      title: 'How to Size a Solar Installation',
      points: [
        { title: 'Calculate your daily kWh load', body: 'Sum each appliance\'s wattage × daily hours of use. A typical UAE villa runs 30–40 kWh/day; add 15% headroom for losses.' },
        { title: 'Pick mono or bifacial', body: 'Mono is cheaper per Wp and ideal for unobstructed roofs. Bifacial wins on light-coloured / elevated mounts where 5–15% rear-side yield is achievable.' },
        { title: 'Match inverter to array', body: 'Inverter DC capacity should be 100–130% of array Wp for optimal clipping. Hybrid inverters add storage flexibility for an extra 15% upfront cost.' },
        { title: 'Don\'t skimp on BoS', body: 'MC4 connectors, DC isolators, surge protection and proper grounding represent <5% of project cost but determine 100% of safety and longevity.' },
      ],
    },
    faq: SHARED_FAQ,
  },
};

export function getCategoryMeta(slug: string): CategoryMeta {
  return (
    CATEGORY_META[slug] ?? {
      hero: {
        eyebrow: 'Industrial Catalog',
        tagline: 'Browse our curated industrial inventory',
        bullet: ['Regional product listings', 'Variant-level pricing', 'B2B quotes available'],
        gradient: 'from-brand-blue via-[#1a4582] to-[#0f2d56]',
        icon: '⚡',
      },
      subCategories: [],
      popularBrands: [],
      buyersGuide: {
        title: "Buyer's Guide",
        points: [
          { title: 'Check the spec sheet', body: 'Product pages show uploaded documents and available variant attributes.' },
          { title: 'Verify requirements', body: 'Confirm any required certification or installation standard from the supplied documentation before ordering.' },
        ],
      },
      faq: SHARED_FAQ,
    }
  );
}
