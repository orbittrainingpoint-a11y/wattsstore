import { renderLegalPage } from '@/lib/legalFallback';

export default async function AboutPage({ params }: { params: Promise<{ country: string }> }) {
  return renderLegalPage((await params).country, {
    slug: 'about',
    title: 'About WattsStore',
    updated: 'May 2026',
    intro: 'An industrial catalog engineered for procurement: certified electrical, lighting and solar products across four regional markets.',
    sections: [
      { heading: 'Built for the work site', paragraphs: ['WattsStore brings regional inventory, original technical documentation and formal quotation workflows into one industrial catalog.'] },
      { heading: 'Original documentation', paragraphs: ['Certifications and specifications are part of the buying journey for every supported product line.'] },
      { heading: 'Regional inventory', paragraphs: ['Pricing and availability are scoped across UAE, Kenya, Germany and Global markets.'] },
      { heading: 'Engineering support', paragraphs: ['Bulk procurement teams can request formal quotes for review by the sales desk.'] },
    ],
  });
}
