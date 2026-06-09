import Link from 'next/link';
import { SOCIAL_ICONS } from '@/lib/images';
import { loadSiteSettings } from '@/lib/cms';

export async function Footer({ region }: { region: string }) {
  const settings = await loadSiteSettings();
  const contact = settings?.contact ?? {
    phone: '+971 50 000 0000',
    email: 'hello@wattsstore.com',
    headquarters: 'Dubai Free Zone, UAE',
  };
  const footer = settings?.footer ?? {
    description: 'Industrial electrical, lighting and solar equipment curated for engineers, MEP consultants and procurement teams.',
    social: {},
    certifications: [],
  };
  const socials = [
    { title: 'LinkedIn', src: SOCIAL_ICONS.linkedin },
    { title: 'Instagram', src: SOCIAL_ICONS.instagram },
    { title: 'YouTube', src: SOCIAL_ICONS.youtube },
    { title: 'WhatsApp', src: SOCIAL_ICONS.whatsapp },
  ];

  return (
    <footer className="mt-20 relative overflow-hidden text-gray-300" style={{ background: 'linear-gradient(180deg,#0b1220 0%,#1a202c 100%)' }}>
      <span className="blob h-96 w-96 -top-32 right-1/4 bg-brand-blue/40" />
      <span className="blob h-72 w-72 bottom-0 left-0 bg-brand-yellow/30" />
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#1e4d8c,#4cc9f0,#f5c400,#1e4d8c)' }} />

      <div className="container-ws relative grid gap-8 py-14 md:grid-cols-12">
        <div className="md:col-span-4">
          <Link href={`/${region}`} className="flex items-center gap-2 text-xl font-extrabold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-[#4cc9f0]">W</span>
            <span><span className="text-gradient">Watts</span>Store</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-gray-400 max-w-sm">{footer.description}</p>
          <div className="mt-5 flex gap-2">
            {socials.map((social) => (
              <a key={social.title} title={social.title} aria-label={social.title} className="h-9 w-9 rounded-lg overflow-hidden hover:scale-110 transition" href={footer.social[social.title.toLowerCase()] ?? '#'}>
                <img src={social.src} alt={social.title} className="h-full w-full" />
              </a>
            ))}
          </div>
          <div className="mt-6 glass-dark rounded-xl p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-brand-yellow font-bold">Headquarters</div>
            <div className="mt-1 text-sm text-white">{contact.headquarters}</div>
            <div className="text-xs text-gray-400">{contact.phone} / {contact.email}</div>
          </div>
        </div>

        <FooterCol title="Catalog" links={[
          ['Industrial Lighting', `/${region}/categories/industrial-lighting`],
          ['Solar Equipment', `/${region}/categories/solar-equipment`],
          ['Power & Control', `/${region}/categories/power-control`],
          ['Wiring & Cables', `/${region}/categories/wiring-accessories`],
          ['All Brands', `/${region}/brands`],
        ]} />
        <FooterCol title="Customer" links={[
          ['Track Order', `/${region}/track`],
          ['FAQ', `/${region}/faq`],
          ['Shipping', `/${region}/shipping-policy`],
          ['Returns', `/${region}/returns-policy`],
          ['Account', `/${region}/account`],
        ]} />
        <FooterCol title="Business" links={[
          ['B2B Quotes', `/${region}/quote-basket`],
          ['Bulk Pricing', `/${region}/contact`],
          ['Solar Planner', `/${region}/solar-planner`],
          ['Blog', `/${region}/blog`],
          ['About Us', `/${region}/about`],
        ]} />

        <div className="md:col-span-3">
          <div className="text-sm font-semibold text-white">Stay in the loop</div>
          <p className="mt-2 text-xs text-gray-400">Spec sheets, new arrivals and B2B pricing. One email a week.</p>
          <form className="mt-3 flex items-center gap-2">
            <input type="email" placeholder="you@company.com" className="input !bg-white/5 !border-white/15 !text-white placeholder:text-white/40" />
            <button type="button" className="btn-yellow shrink-0">Subscribe</button>
          </form>
          <div className="mt-5 grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider">
            {footer.certifications.map((cert) => (
              <div key={cert} className="rounded-md border border-white/10 px-2 py-1.5 text-center text-gray-400">{cert}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-ws flex flex-col items-center justify-between gap-3 py-5 text-xs text-gray-400 sm:flex-row">
          <span>Copyright {new Date().getFullYear()} WattsStore FZE. All rights reserved.</span>
          <span>Secure Payments: VISA / MC / AMEX via Stripe</span>
          <div className="flex items-center gap-3">
            <Link href={`/${region}/privacy-policy`} className="link-underline hover:text-white">Privacy</Link>
            <Link href={`/${region}/terms-of-service`} className="link-underline hover:text-white">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2">
      <h3 className="text-[11px] uppercase tracking-[0.18em] font-bold text-brand-yellow">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([label, href]) => (
          <li key={`${label}-${href}`}><Link href={href} className="text-gray-400 link-underline hover:text-white">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
