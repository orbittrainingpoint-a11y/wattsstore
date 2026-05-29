import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

/** Reusable gradient hero with breadcrumb, eyebrow, title, subtitle and optional illustration. */
export function PageHero({
  crumbs,
  eyebrow,
  title,
  sub,
  tone = 'blue',
  cta,
  illustration,
}: {
  crumbs: { label: string; href?: string }[];
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'blue' | 'mint' | 'violet' | 'amber';
  cta?: { label: string; href: string };
  illustration?: string;   // optional SVG/image displayed on the right at md+
}) {
  const bg = {
    blue:   'from-[#0b1f3d] via-[#1e4d8c] to-[#0b1f3d]',
    mint:   'from-[#062c22] via-emerald-700 to-[#062c22]',
    violet: 'from-[#23163a] via-[#3b2a86] to-[#23163a]',
    amber:  'from-[#3a2200] via-amber-800 to-[#1f1300]',
  }[tone];

  return (
    <section className={`relative overflow-hidden text-white bg-gradient-to-br ${bg}`}>
      <div className="absolute inset-0 grid-lines opacity-25" />
      <span className="blob h-72 w-72 -top-10 -right-10 bg-brand-yellow" />
      <span className="blob h-72 w-72 bottom-0 -left-10 bg-[#4cc9f0]" />

      <div className={`container-ws relative py-10 md:py-14 ${illustration ? 'md:grid md:grid-cols-[1fr_280px] md:items-center md:gap-8' : ''}`}>
        <div>
          <div className="text-white/85"><Breadcrumb items={crumbs} /></div>
          <div className="mt-4 max-w-3xl">
            {eyebrow && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/12 backdrop-blur px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow" />{eyebrow}
              </div>
            )}
            <h1 className="mt-3 !text-white text-3xl md:text-5xl font-extrabold leading-[1.08]">{title}</h1>
            {sub && <p className="mt-3 text-sm md:text-base text-white/85 leading-relaxed">{sub}</p>}
            {cta && (
              <div className="mt-6">
                <Link href={cta.href} className="btn-yellow btn-lg">{cta.label} →</Link>
              </div>
            )}
          </div>
        </div>

        {illustration && (
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-white/10 backdrop-blur border border-white/20" />
              <img src={illustration} alt="" className="relative w-full h-auto rounded-xl floaty" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
