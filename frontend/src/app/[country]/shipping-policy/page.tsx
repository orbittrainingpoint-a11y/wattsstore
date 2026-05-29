import { renderLegalPage } from '@/lib/legalFallback';

export default async function ShippingPolicy({ params }: { params: Promise<{ country: string }> }) {
  return renderLegalPage((await params).country, {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    updated: 'May 2026',
    intro: 'Lead times, costs, regional coverage and the shipping-verification step.',
    sections: [
      { heading: 'Where we ship', paragraphs: ['Available markets and project delivery locations are confirmed during checkout or quotation.', 'Delivery schedules depend on inventory, address and selected fulfillment method.'] },
      { heading: 'Lead times', paragraphs: ['UAE: 2–5 business days (Express 1–2 days within Dubai metro).', 'Kenya: 5–10 business days to Nairobi and major cities.', 'Germany: 3–7 business days nationwide.', 'International: quoted separately via RFQ.'] },
      { heading: 'Cost', paragraphs: ['Calculated per item at checkout based on base shipping cost + weight × per-kg adder. Free delivery on qualifying orders (threshold shown at checkout).', "Customs duties for international shipments are billed separately and are the buyer's responsibility."] },
      { heading: 'Shipping verification', paragraphs: ['After payment, you will receive an email with a one-click link to verify the shipping address. Orders do not ship until this link is clicked. This protects against fraudulent payments and mis-typed addresses.'] },
      { heading: 'Tracking', paragraphs: ['Once dispatched, you receive an email with the carrier and tracking number. Customers can also use the Track Order page or My Account section.'] },
      { heading: 'Failed delivery', paragraphs: ['If a courier cannot deliver after 3 attempts, the order returns to our warehouse and we refund minus return shipping. Contact us to reschedule before this happens.'] },
      { heading: 'Bulk / project freight', paragraphs: ['For pallet- or container-scale orders, freight is quoted as part of the RFQ. We coordinate with DHL, Aramex, sea-freight forwarders depending on origin and timeline.'] },
    ],
  });
}
