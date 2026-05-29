'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const SORTS = [
  ['featured', 'Featured'],
  ['newest', 'Newest'],
  ['popular', 'Most Popular'],
  ['top_rated', 'Top Rated'],
  ['price_asc', 'Price: Low → High'],
  ['price_desc', 'Price: High → Low'],
];

export function SortBar({ totalCount }: { totalCount: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sort = params.get('sort') ?? 'featured';

  const setSort = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v === 'featured') next.delete('sort'); else next.set('sort', v);
    router.push(`${pathname}?${next.toString()}`);
  };

  // Active filter pills (everything except sort/page/view)
  const pills = [...params.entries()].filter(([k]) => !['sort', 'page', 'view'].includes(k));
  const removePill = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-bold text-brand-dark">{totalCount.toLocaleString()}</span>
        <span className="text-brand-gray">{totalCount === 1 ? 'product' : 'products'}</span>
        {pills.length > 0 && (
          <div className="ml-3 flex flex-wrap gap-1.5">
            {pills.map(([k, v]) => (
              <button key={k} onClick={() => removePill(k)} className="badge bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white">
                {prettify(k)}: {prettyValue(v)} ✕
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-brand-gray">Sort:</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none">
          {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </div>
  );
}

function prettify(k: string) {
  if (k === 'inStock') return 'Stock';
  if (k === 'onSale') return 'Sale';
  if (k === 'brandOrigin') return 'Origin';
  if (k === 'minPrice') return 'Min';
  if (k === 'maxPrice') return 'Max';
  if (k.startsWith('attr_')) return k.slice(5).replace(/_/g, ' ');
  return k;
}

function prettyValue(v: string) {
  if (v === 'true') return 'Yes';
  return v.length > 18 ? v.slice(0, 18) + '…' : v;
}
