import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { HERO_IMAGES } from '@/lib/images';
import { DynamicPromoBanner } from '@/components/ui/DynamicPromoBanner';

export default async function SolarPlannerPage({ params }: { params: Promise<{ country: string }> }) {
  const region = (await params).country;
  return (
    <div>
      <PageHero
        tone="mint"
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Solar Planner' }]}
        eyebrow="Phase 2 · Coming soon"
        title={<>AI Solar Planner.<br/><span className="text-gradient-on-dark">Upload, size, ROI.</span></>}
        sub="Upload your roof or floor plan. Get a panel layout, system size, and a 5-year ROI forecast — all in a single PDF."
      />

      <section className="container-ws py-14">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="section-title">How it will work</h2>
            <ol className="mt-5 space-y-4">
              {[
                ['Upload', 'Drag in a roof or floor plan image (PNG/JPG up to 10MB).'],
                ['Detect', 'Our worker detects usable area, shading, obstacles.'],
                ['Layout', 'Optimal panel placement on a vector grid — count + Wp.'],
                ['Forecast', 'Year-by-year yield + cumulative savings + payback period.'],
              ].map(([t, s], i) => (
                <li key={t as string} className="flex gap-4">
                  <div className="h-9 w-9 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold">{i + 1}</div>
                  <div>
                    <div className="font-bold">{t}</div>
                    <div className="text-sm text-brand-gray">{s}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/${region}/quote-basket`} className="btn-primary btn-lg">Request access</Link>
              <Link href={`/${region}/categories/solar-equipment`} className="btn-outline btn-lg">Browse Solar Catalog</Link>
            </div>
          </div>
          <div className="card overflow-hidden">
            <img src={HERO_IMAGES.solar} alt="Solar planner preview" className="w-full h-auto" />
          </div>
        </div>
      </section>

      <section className="container-ws pb-14 md:pb-20">
        <DynamicPromoBanner
          region={region}
          placement="promo"
          index={1}
          big
          fallback={{ eyebrow: 'Be first in line', title: 'Early access opens Q4 2026.', cta: 'Notify me', href: `/${region}/contact`, image: '/img/banners/cms/solar-hero.jpg', tone: 'mint' }}
        />
      </section>
    </div>
  );
}
