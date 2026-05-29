'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export interface FilterSpec {
  field: string;
  label: string;
  options: string[];
}

/**
 * Filter container — desktop renders as sticky sidebar, mobile renders a "Filters" button
 * that opens the same body inside a bottom sheet.
 */
export function FilterSidebar({ specs, currency }: { specs: FilterSpec[]; currency: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const params = useSearchParams();
  const activeCount =
    [...params.entries()].filter(([k]) => k !== 'sort' && k !== 'page' && k !== 'view').length;

  useEffect(() => {
    document.body.classList.toggle('lock-scroll', mobileOpen);
    return () => { document.body.classList.remove('lock-scroll'); };
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block lg:sticky lg:top-[150px] lg:h-fit">
        <FilterBody specs={specs} currency={currency} />
      </aside>

      {/* Mobile trigger pill — sticky just below the sort bar */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm"
      >
        <FunnelIcon />
        Filters
        {activeCount > 0 && <span className="badge bg-brand-blue text-white">{activeCount}</span>}
      </button>

      {/* Mobile bottom-sheet */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-label="Filters">
          <div className="absolute inset-0 bg-brand-dark/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[90dvh] flex flex-col fade-up safe-pb">
            <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-gray-300" />
            <header className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold">Filters</h3>
                {activeCount > 0 && <span className="badge bg-brand-blue text-white">{activeCount}</span>}
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-2xl leading-none" aria-label="Close">×</button>
            </header>
            <div className="flex-1 overflow-y-auto px-1">
              <FilterBody specs={specs} currency={currency} hideHeader />
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 border-t border-gray-100">
              <button onClick={() => setMobileOpen(false)} className="btn-outline">Close</button>
              <button onClick={() => setMobileOpen(false)} className="btn-primary">Show results</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterBody({ specs, currency, hideHeader }: { specs: FilterSpec[]; currency: string; hideHeader?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [openSections, setOpen] = useState<Set<string>>(new Set(['price', 'origin', 'avail', ...specs.slice(0, 3).map((s) => s.field)]));

  const isOpen = (k: string) => openSections.has(k);
  const toggleSection = (k: string) =>
    setOpen((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const navigate = useCallback((next: URLSearchParams) => {
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }, [router, pathname]);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') next.delete(key); else next.set(key, value);
    navigate(next);
  };

  const toggleArrayParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    const list = (next.get(key) ?? '').split(',').filter(Boolean);
    const newList = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    if (newList.length) next.set(key, newList.join(',')); else next.delete(key);
    navigate(next);
  };

  const activeList = (key: string) => (params.get(key) ?? '').split(',').filter(Boolean);
  const minPrice = params.get('minPrice') ?? '';
  const maxPrice = params.get('maxPrice') ?? '';
  const clearAll = () => router.push(pathname);
  const activeCount = [...params.entries()].filter(([k]) => k !== 'sort' && k !== 'page' && k !== 'view').length;

  return (
    <div className={hideHeader ? '' : 'card overflow-hidden'}>
      {!hideHeader && (
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-brand-blue/5">
          <div className="flex items-center gap-2">
            <FunnelIcon />
            <h3 className="font-bold text-sm">Filters</h3>
            {activeCount > 0 && <span className="badge bg-brand-blue text-white">{activeCount}</span>}
          </div>
          {activeCount > 0 && <button onClick={clearAll} className="text-xs font-semibold text-status-error hover:underline">Clear all</button>}
        </header>
      )}

      <Group label="Price range" k="price" open={isOpen('price')} onToggle={toggleSection}>
        <div className="flex items-center gap-2">
          <input className="input !py-1.5 !text-sm" placeholder={`Min ${currency}`} value={minPrice} onChange={(e) => set('minPrice', e.target.value || null)} type="number" inputMode="numeric" />
          <span className="text-brand-gray">–</span>
          <input className="input !py-1.5 !text-sm" placeholder={`Max ${currency}`} value={maxPrice} onChange={(e) => set('maxPrice', e.target.value || null)} type="number" inputMode="numeric" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[['< 100', 0, 100], ['100–500', 100, 500], ['500–2K', 500, 2000], ['> 2K', 2000, null]].map(([label, mn, mx]) => (
            <button key={String(label)} onClick={() => { const n = new URLSearchParams(params.toString()); n.set('minPrice', String(mn)); if (mx) n.set('maxPrice', String(mx)); else n.delete('maxPrice'); navigate(n); }} className="badge bg-gray-100 hover:bg-brand-blue/10 hover:text-brand-blue cursor-pointer">{label as string}</button>
          ))}
        </div>
      </Group>

      <Group label="Availability" k="avail" open={isOpen('avail')} onToggle={toggleSection}>
        <Check label="In Stock Only" checked={params.get('inStock') === 'true'} onChange={(v) => set('inStock', v ? 'true' : null)} />
        <Check label="On Sale" checked={params.get('onSale') === 'true'} onChange={(v) => set('onSale', v ? 'true' : null)} />
        <Check label="New Arrivals" checked={params.get('newArrivals') === 'true'} onChange={(v) => set('newArrivals', v ? 'true' : null)} />
      </Group>

      <Group label="Brand origin" k="origin" open={isOpen('origin')} onToggle={toggleSection}>
        {[['Indian','🇮🇳'],['Chinese','🇨🇳'],['German','🇩🇪']].map(([o,f]) => (
          <Check key={o} label={`${f} ${o}`} checked={params.get('brandOrigin') === o} onChange={(v) => set('brandOrigin', v ? o : null)} />
        ))}
      </Group>

      {specs.map((spec) => (
        <Group key={spec.field} label={spec.label} k={spec.field} open={isOpen(spec.field)} onToggle={toggleSection}>
          <div className="max-h-44 overflow-y-auto pr-1">
            {spec.options.map((opt) => (
              <Check key={opt} label={opt} checked={activeList(`attr_${spec.field}`).includes(opt)} onChange={() => toggleArrayParam(`attr_${spec.field}`, opt)} />
            ))}
          </div>
        </Group>
      ))}
    </div>
  );
}

function Group({ label, k, open, onToggle, children }: { label: string; k: string; open: boolean; onToggle: (k: string) => void; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100">
      <button onClick={() => onToggle(k)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-gray-50">
        <span>{label}</span>
        <span className={`text-brand-blue transition-transform ${open ? 'rotate-180' : ''}`}>⌃</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-1.5">{children}</div>}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer text-sm py-1.5 hover:text-brand-blue">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/30" />
      <span>{label}</span>
    </label>
  );
}

function FunnelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 5h18l-7 9v6l-4-2v-4z"/>
    </svg>
  );
}
