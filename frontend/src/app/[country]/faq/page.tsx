import Link from 'next/link';
import { api } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Accordion } from '@/components/ui/Accordion';
import { TRUST_ICONS, ACCOUNT_ICONS } from '@/lib/images';
import { loadBanners } from '@/lib/cms';
import { DynamicPromoBanner } from '@/components/ui/DynamicPromoBanner';

export default async function FaqPage({ params }: { params: Promise<{ country: string }> }) {
  const region = (await params).country;
  const [res, sideBanners] = await Promise.all([
    api.get<Record<string, { question: string; answer: string }[]>>('/faq', { country: region }).catch(() => null),
    loadBanners('sidebar', region),
  ]);
  const groups = res?.data ?? {};
  const heroImage = sideBanners[1]?.imageUrl ?? '/img/banners/cms/support-rfq.jpg';

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Help & FAQ' }]} />

      <header className="mt-4 relative overflow-hidden rounded-2xl text-white p-7 md:p-10" style={{ background: 'linear-gradient(135deg,#0b1f3d 0%,#1e4d8c 100%)' }}>
        <img src={heroImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-r from-[#071321]/95 via-[#071321]/78 to-[#071321]/20" />
        <span className="absolute inset-0 bg-[#071321]/28" />
        <div className="relative max-w-2xl">
          <div className="section-eyebrow text-brand-yellow">Help Center</div>
          <h1 className="mt-2 !text-white text-3xl md:text-5xl font-extrabold leading-tight">How can we help?</h1>
          <p className="mt-3 text-white/80 text-sm">Search common questions about orders, B2B quotes, payments, and certifications.</p>
          <form action={`/${region}/search`} className="mt-5 flex gap-2 max-w-md">
            <input name="q" placeholder="Search the help center…" className="input !rounded-full !bg-white/95" />
            <button className="btn-yellow shrink-0">Search</button>
          </form>
        </div>
      </header>

      {/* Quick links — visual tiles */}
      <section className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: ACCOUNT_ICONS.orders,   t: 'Orders & Shipping', s: 'Track, modify, ship policy' },
          { icon: ACCOUNT_ICONS.quotes,   t: 'B2B Quotes',        s: 'RFQ workflow, pricing' },
          { icon: TRUST_ICONS.secure,     t: 'Payments',          s: 'Methods, terms, refunds' },
          { icon: TRUST_ICONS.certified,  t: 'Documents',         s: 'Uploaded product files' },
        ].map((c) => (
          <div key={c.t} className="card card-hover p-5">
            <img src={c.icon} alt="" className="h-10 w-10" />
            <div className="mt-3 font-bold">{c.t}</div>
            <div className="text-xs text-brand-gray mt-1">{c.s}</div>
          </div>
        ))}
      </section>

      {Object.keys(groups).length === 0 ? (
        <p className="mt-10 text-sm text-brand-gray text-center">No FAQ entries available yet.</p>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_300px]">
          <div>
            {Object.entries(groups).map(([category, entries]) => (
              <section key={category} className="mb-8">
                <h2 className="section-title mb-4">{category}</h2>
                <Accordion items={entries.map((e) => ({ q: e.question, a: e.answer }))} single={false} />
              </section>
            ))}
          </div>
          <aside className="lg:sticky lg:top-[150px] lg:h-fit space-y-3">
            <DynamicPromoBanner
              region={region}
              placement="sidebar"
              index={1}
              compact
              fallback={{ eyebrow: 'Still stuck?', title: 'Talk to a human', cta: 'Contact Support', href: `/${region}/contact`, image: '/img/banners/cms/support-rfq.jpg', tone: 'blue' }}
            />
            <div className="card p-5">
              <div className="section-eyebrow">B2B</div>
              <h3 className="mt-2 font-bold text-base">Need bulk pricing?</h3>
              <Link href={`/${region}/quote-basket`} className="btn-yellow btn-sm mt-3 inline-flex">Submit RFQ</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
