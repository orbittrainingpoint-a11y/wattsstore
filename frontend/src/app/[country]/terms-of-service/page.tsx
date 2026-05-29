import { renderLegalPage } from '@/lib/legalFallback';

export default async function TermsOfService({ params }: { params: Promise<{ country: string }> }) {
  return renderLegalPage((await params).country, {
    slug: 'terms-of-service',
    title: 'Terms of Service',
    updated: 'May 2026',
    intro: 'The rules that govern your use of WattsStore.',
    sections: [
      { heading: 'Acceptance', paragraphs: ['By browsing or purchasing on wattsstore.com you agree to these terms. If you do not agree, do not use the service.'] },
      { heading: 'Account', paragraphs: ['You are responsible for activity under your account. Keep your password secret. Notify us at security@wattsstore.com if you suspect compromise.'] },
      { heading: 'Orders & pricing', paragraphs: ['Prices are listed in the regional currency shown. We reserve the right to refuse or cancel orders with manifest pricing errors (and refund any captured payment).', 'B2B quotes are valid for the period stated on the quote (typically 30 days).'] },
      { heading: 'Shipping & delivery', paragraphs: ['Shipping costs are calculated at checkout based on weight, region and dimensions. Orders ship after the customer verifies the shipping address via the link emailed after payment.'] },
      { heading: 'Returns & warranty', paragraphs: ['Standard 7-day return window for unopened items. Custom-configured / ATEX-rated SKUs are non-returnable. See the Returns Policy for details.', 'Manufacturer warranty applies per product (typically 2 years).'] },
      { heading: 'Acceptable use', paragraphs: ['No scraping, automated checkout, or fraudulent payment instruments. Abuse may result in account suspension and legal action.'] },
      { heading: 'Intellectual property', paragraphs: ['All content (text, images, code, layout) is © WattsStore FZE. Product datasheets and certifications remain property of the respective manufacturers.'] },
      { heading: 'Liability', paragraphs: ['WattsStore is not liable for consequential or indirect damages. Maximum liability is the order value. Nothing limits liability that cannot be limited by law.'] },
      { heading: 'Governing law', paragraphs: ['These terms are governed by the laws of the UAE. Disputes are resolved in Dubai courts unless a mandatory consumer-protection law states otherwise.'] },
    ],
  });
}
