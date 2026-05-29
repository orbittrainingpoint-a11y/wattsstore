import { renderLegalPage } from '@/lib/legalFallback';

export default async function ReturnsPolicy({ params }: { params: Promise<{ country: string }> }) {
  return renderLegalPage((await params).country, {
    slug: 'returns-policy',
    title: 'Returns & Warranty',
    updated: 'May 2026',
    intro: "How to return items, when items can't be returned, and how warranty claims work.",
    sections: [
      { heading: 'Window', paragraphs: ['Standard 7-day return window from delivery for unopened, undamaged items in original packaging.'] },
      { heading: 'Non-returnable items', paragraphs: ['Custom-configured products (cut-to-length cables, specific-voltage variants).', 'ATEX-rated and IECEx-rated explosive-atmosphere products (regulatory).', 'Items showing signs of installation or use.'] },
      { heading: 'How to initiate', paragraphs: ['Email returns@wattsstore.com with your order number and reason. We respond within 1 business hour with an RMA number and prepaid label (where applicable).'] },
      { heading: 'Refund timeline', paragraphs: ['Refunds processed to the original payment method within 5–10 business days of receiving the returned goods.', 'For Bank Transfer / RFQ orders, refunds are issued via wire to the originating account.'] },
      { heading: 'Damaged in transit', paragraphs: ['Photograph the package before opening if there is visible damage. Email photos to support@wattsstore.com within 48 hours of delivery — we ship a replacement at our expense.'] },
      { heading: 'Manufacturer warranty', paragraphs: ['Most products carry a 2-year manufacturer warranty against defects. Solar panels carry a 5-year product / 25-year linear performance warranty.', 'Warranty claims: email warranty@wattsstore.com with order number, serial number and a description of the defect. We coordinate the RMA with the manufacturer.'] },
      { heading: 'B2B orders', paragraphs: ['Bulk-quote orders carry contract-specific terms negotiated with the sales agent. Refer to your formal PDF invoice or contact your assigned agent.'] },
    ],
  });
}
