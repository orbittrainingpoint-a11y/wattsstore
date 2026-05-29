import Link from 'next/link';

/** Split-screen auth shell — left brand panel (futuristic gradient), right glass form card. */
export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div suppressHydrationWarning className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* Brand panel */}
      <div suppressHydrationWarning className="hidden lg:block relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg,#0b1f3d 0%,#1e4d8c 60%,#0b1f3d 100%)' }}>
        <div suppressHydrationWarning className="absolute inset-0 grid-lines opacity-30" />
        <span className="blob h-96 w-96 -top-20 -right-20 bg-brand-yellow" />
        <span className="blob h-80 w-80 bottom-0 -left-20 bg-[#4cc9f0]" />

        <div suppressHydrationWarning className="relative h-full p-12 flex flex-col">
          <Link href="/ae" className="inline-flex items-center gap-2 text-2xl font-extrabold w-fit">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-yellow to-[#ffb84d] text-brand-dark">⚡</span>
            <span><span className="text-gradient">Watts</span>Store</span>
          </Link>

          <div suppressHydrationWarning className="mt-auto">
            <div suppressHydrationWarning className="section-eyebrow text-brand-yellow">Industrial Catalog · 2026</div>
            <h2 className="mt-3 text-4xl xl:text-5xl font-extrabold leading-tight">
              Source faster.<br/>
              <span className="text-gradient-on-dark">Spec smarter.</span>
            </h2>
            <p className="mt-4 text-white/70 max-w-md text-sm">
              Browse regional industrial products, view uploaded specifications and request formal quotations.
            </p>
            <div suppressHydrationWarning className="mt-8 grid grid-cols-3 gap-3">
              {[['Live','Catalog'],['RFQ','Ready'],['B2B','Support']].map(([n,l]) => (
                <div suppressHydrationWarning key={l} className="glass-dark rounded-xl p-4">
                  <div suppressHydrationWarning className="text-2xl font-extrabold text-brand-yellow">{n}</div>
                  <div suppressHydrationWarning className="text-[10px] uppercase tracking-[0.18em] text-white/85 font-bold">{l}</div>
                </div>
              ))}
            </div>
            <div suppressHydrationWarning className="mt-10 flex flex-wrap gap-2">
              {['Regional Catalog', 'Documents', 'B2B Quotes', 'Secure Account'].map((c) => (
                <span key={c} className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70 font-bold">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div suppressHydrationWarning className="relative flex items-center justify-center p-6 md:p-10">
        <span className="blob h-72 w-72 -top-20 left-1/3 bg-brand-blue/20" />
        <span className="blob h-72 w-72 bottom-0 right-1/3 bg-brand-yellow/30" />

        <div suppressHydrationWarning className="w-full max-w-md relative">
          <Link href="/ae" className="lg:hidden inline-flex items-center gap-2 text-xl font-extrabold mb-6">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white">⚡</span>
            <span><span className="text-gradient">Watts</span>Store</span>
          </Link>
          <div suppressHydrationWarning className="card p-7 md:p-8 fade-up">
            <h1 className="text-2xl font-extrabold">{title}</h1>
            {sub && <p className="mt-1 text-sm text-brand-gray">{sub}</p>}
            <div suppressHydrationWarning className="mt-6">{children}</div>
          </div>
          <p className="mt-4 text-[11px] text-center text-brand-gray">
            Protected by 256-bit TLS · Your data is encrypted end-to-end.
          </p>
        </div>
      </div>
    </div>
  );
}
