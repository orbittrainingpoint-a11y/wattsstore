import { renderLegalPage } from '@/lib/legalFallback';

export default async function PrivacyPolicy({ params }: { params: Promise<{ country: string }> }) {
  return renderLegalPage((await params).country, {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    updated: 'May 2026',
    intro: 'What data we collect, how we use it, and how you can manage it. Plain English.',
    sections: [
      { heading: 'Data we collect', paragraphs: ['Account details (name, email, phone) when you register.', 'Order/quote data (line items, address, contact) when you transact.', 'Anonymous analytics (page views, device, IP-derived country) to improve the site.'] },
      { heading: 'How we use it', paragraphs: ['Fulfill orders, send invoices, ship goods.', 'Respond to RFQs and support requests.', 'Send transactional emails (order status, verification, password reset).', 'Email marketing — only with explicit opt-in.'] },
      { heading: 'Storage & security', paragraphs: ['Passwords are bcrypt-hashed (cost 12). We never store raw card data — payments go through Stripe/PayTabs (PCI DSS).', 'JWT cookies are HttpOnly, Secure, SameSite=Strict.', 'All traffic is TLS 1.3 in transit.'] },
      { heading: 'Cookies', paragraphs: ['Strictly necessary cookies for auth and cart. Optional analytics cookies require consent (we will surface a banner before any non-essential cookie is set in regulated regions).'] },
      { heading: 'Sharing with third parties', paragraphs: ['Payment processors (Stripe, PayTabs), shipping carriers, and the IRS/tax authorities where legally required. Never sold or shared for marketing.'] },
      { heading: 'Your rights', paragraphs: ['Access, correction, deletion and portability of your data — write to privacy@wattsstore.com. EU residents have GDPR rights; UAE residents have rights under PDPL.'] },
      { heading: 'Retention', paragraphs: ['Order records are kept for 7 years (legal/tax requirement). Account data is deleted on request unless tied to open orders or warranty claims.'] },
      { heading: 'Contact', paragraphs: ['Questions? Email privacy@wattsstore.com or reach our Data Protection Officer at dpo@wattsstore.com.'] },
    ],
  });
}
