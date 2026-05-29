import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ProductCard as TProductCard } from '@/types';
import { REGIONS } from '@/lib/utils';
import { resolveCurrency } from '@/lib/country';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { CategoryTile } from '@/components/catalog/CategoryTile';

interface ApiCategory {
  name: string;
  slug: string;
  imageUrl?: string | null;
}

const POPULAR = [
  'explosion-proof light', 'solar panel 550Wp', 'hybrid inverter 5kW', 'cable gland', 'MCB 32A',
  'high-bay 200W', 'bifacial panel', 'distribution board', 'IP66 floodlight',
];

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const region = (await params).country;
  const currency = await resolveCurrency(region);
  const q = (await searchParams).q ?? '';
  let products: TProductCard[] = [];
  let totalCount = 0;
  const categories = await api.get<ApiCategory[]>('/catalog/categories', { country: region }).then((res) => res.data).catch(() => []);
  const res = q
    ? await api.get<TProductCard[]>(`/catalog/search?q=${encodeURIComponent(q)}&limit=24`, { country: region }).catch(() => null)
    : await api.get<TProductCard[]>('/catalog/products?limit=24', { country: region }).catch(() => null);
  products = res?.data ?? [];
  totalCount = res?.meta?.totalCount ?? products.length;

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Search', href: `/${region}/search` }, { label: q || 'Browse' }]} />

      <header className="mt-4 relative overflow-hidden rounded-2xl text-white p-7 md:p-9" style={{ background: 'linear-gradient(135deg,#0b1f3d 0%,#1e4d8c 100%)' }}>
        <span className="blob h-72 w-72 -top-10 -right-10 bg-brand-yellow" />
        <div className="relative">
          <div className="section-eyebrow text-brand-yellow">Results</div>
          <h1 className="mt-2 text-2xl md:text-4xl font-extrabold leading-tight">
            {q ? <>For &ldquo;<span className="text-brand-yellow">{q}</span>&rdquo;</> : 'Browse the catalog'}
          </h1>
          <div className="mt-3 text-sm text-white/80">{totalCount.toLocaleString()} {totalCount === 1 ? 'product' : 'products'} found</div>
          {/* Inline search */}
          <form action={`/${region}/search`} className="mt-5 flex gap-2 max-w-xl">
            <input name="q" defaultValue={q} className="input !rounded-full !bg-white/95" placeholder="Refine search…" />
            <button className="btn-yellow shrink-0">Search</button>
          </form>
        </div>
      </header>

      {/* Popular search chips when no query */}
      {!q && (
        <section className="mt-6">
          <div className="section-eyebrow">Popular Searches</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {POPULAR.map((t) => (
              <Link key={t} href={`/${region}/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue transition">
                {t}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Results grid */}
      {products.length > 0 ? (
        <section className="mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} region={region} currency={currency} />)}
        </section>
      ) : q ? (
        <section className="mt-8 card p-12 text-center">
          <div className="text-6xl">🔍</div>
          <h2 className="mt-3 text-xl font-bold">No products found</h2>
          <p className="mt-1 text-sm text-brand-gray">Try a broader keyword, check the spelling, or browse categories below.</p>
        </section>
      ) : null}

      {/* Browse categories fallback */}
      <section className="mt-10">
        <div className="section-eyebrow">Browse by category</div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((category) => <CategoryTile key={category.slug} region={region} data={{ name: category.name, slug: category.slug, image: category.imageUrl ?? undefined }} />)}
        </div>
      </section>
    </div>
  );
}
