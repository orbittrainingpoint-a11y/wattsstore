import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard as TProductCard } from '@/types';
import { REGIONS } from '@/lib/utils';
import { resolveCurrency } from '@/lib/country';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CategoryTile } from '@/components/catalog/CategoryTile';
import { BrandTile } from '@/components/catalog/BrandTile';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Accordion } from '@/components/ui/Accordion';
import { Rail } from '@/components/ui/Rail';
import { FilterSidebar, FilterSpec } from '@/components/catalog/FilterSidebar';
import { SortBar } from '@/components/catalog/SortBar';
import { getCategoryMeta } from '@/lib/categoryMeta';
import { loadBanners } from '@/lib/cms';
import { BannerTile } from '@/components/ui/BannerTile';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  variantSpecificationSchema: FilterSpec[] | null;
  children: { id: number; name: string; slug: string }[];
}

interface CategoryNavItem {
  name: string;
  slug: string;
  imageUrl?: string | null;
}

interface ApiBrand {
  name: string;
  slug: string;
  originCountry?: string | null;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { country: region, slug } = await params;
  const query = await searchParams;
  const currency = await resolveCurrency(region);
  const meta = getCategoryMeta(slug);
  const categoryBanners = await loadBanners('category', region);
  const categoryBanner = categoryBanners[0];
  const categoryImage = categoryBanner?.imageUrl ?? '/img/banners/cms/hazardous-lighting.jpg';

  // Resolve category
  const cat = await api.get<Category>(`/catalog/categories/${slug}`, { country: region }).catch(() => null);
  const category = cat?.data ?? null;
  const [relatedCategories, brands] = await Promise.all([
    api.get<CategoryNavItem[]>('/catalog/categories', { country: region }).then((res) => res.data).catch(() => []),
    api.get<ApiBrand[]>('/catalog/brands', { country: region }).then((res) => res.data).catch(() => []),
  ]);

  // Build product query from searchParams
  const productQuery = new URLSearchParams();
  if (category) productQuery.set('catId', String(category.id));
  for (const k of ['sort', 'inStock', 'onSale', 'newArrivals', 'brandOrigin', 'minPrice', 'maxPrice', 'brand']) {
    if (query[k]) productQuery.set(k, query[k]);
  }
  for (const k of Object.keys(query)) {
    if (k.startsWith('attr_')) {
      const field = k.slice(5);
      for (const v of query[k].split(',').filter(Boolean)) {
        productQuery.append(`attributes[${field}]`, v);
      }
    }
  }

  const productsRes = await api
    .get<TProductCard[]>(`/catalog/products?${productQuery.toString()}`, { country: region })
    .catch(() => null);
  const products = productsRes?.data ?? [];
  const totalCount = productsRes?.meta?.totalCount ?? products.length;

  const specs: FilterSpec[] = Array.isArray(category?.variantSpecificationSchema)
    ? category!.variantSpecificationSchema!.map((s: FilterSpec & { options?: string[] }) => ({ field: s.field, label: s.label, options: s.options ?? [] })).filter((s) => s.options.length > 0)
    : [];

  return (
    <div>
      {/* 1. HERO BANNER */}
      <section className="relative overflow-hidden bg-[#071321] text-white">
        <img src={categoryImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#071321]/95 via-[#071321]/82 to-[#071321]/28" />
        <div className="absolute inset-0 bg-[#071321]/24" />
        <div className="absolute inset-0 dot-grid opacity-10" />
        <div className="container-ws relative py-12 md:py-16">
          <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Catalog', href: `/${region}` }, { label: category?.name ?? meta.hero.tagline.split(' ')[0] }]} />
          <div className="mt-4 grid md:grid-cols-[1fr_auto] items-end gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-bold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow" />
                {meta.hero.eyebrow}
              </div>
              <h1 className="mt-3 !text-white text-3xl md:text-5xl font-extrabold leading-tight max-w-3xl">
                {category?.name ?? meta.hero.tagline}
              </h1>
              <p className="mt-3 max-w-2xl text-white/85 text-sm md:text-base">
                {category?.description ?? 'Browse the live regional catalog and request formal project pricing from the sales team.'}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 text-xs">
                {meta.hero.bullet.map((b) => (
                  <li key={b} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                    <span className="text-brand-yellow">✓</span>{b}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-4 text-sm">
                <Stat n={totalCount.toLocaleString()} l="products" />
                <span className="opacity-30">|</span>
                <Stat n={`${brands.length}`} l="brands" />
                <span className="opacity-30">|</span>
                <Stat n={`${category?.children.length ?? 0}`} l="sub-categories" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SUB-CATEGORY TILES */}
      {meta.subCategories.length > 0 && (
        <section className="container-ws py-10">
          <SectionHeader eyebrow="Browse" title="Shop by Sub-Category" subtitle="Drill into a specific application — every tile is filtered to relevant SKUs only." />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {meta.subCategories.map((s) => (
              <CategoryTile key={s.slug} region={region} data={{ name: s.name, slug, icon: s.icon, gradient: 'bg-gradient-to-br from-brand-blue/10 to-brand-yellow/10' }} />
            ))}
          </div>
        </section>
      )}

      {/* 3. POPULAR BRANDS */}
      {brands.length > 0 && (
        <section className="surface-soft border-y border-gray-200 py-10">
          <div className="container-ws">
            <SectionHeader eyebrow="Trusted Makers" title={`Popular Brands in ${category?.name ?? 'this category'}`} viewAllHref={`/${region}/brands`} viewAllLabel="All Brands" />
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {brands.slice(0, 6).map((brand) => (
                <BrandTile
                  key={brand.slug}
                  region={region}
                  brand={{
                    name: brand.name,
                    slug: brand.slug,
                    origin: brand.originCountry === 'India' ? 'Indian' : brand.originCountry === 'China' ? 'Chinese' : brand.originCountry === 'Germany' ? 'German' : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. MAIN GRID — sticky sidebar (desktop) / bottom-sheet (mobile) + products */}
      <section className="container-ws py-10">
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <FilterSidebar specs={specs} currency={currency} />

          <div>
            <div className="flex items-center justify-between gap-3 lg:block">
              {/* the FilterSidebar renders a "Filters" pill on mobile that lives next to the SortBar */}
            </div>
            <SortBar totalCount={totalCount} />

            {products.length === 0 ? (
              <div className="card p-12 text-center mt-5">
                <div className="text-5xl">🔍</div>
                <h3 className="mt-3 text-lg font-bold">No products match your filters</h3>
                <p className="mt-1 text-sm text-brand-gray">Try clearing some filters, or browse our recommendations below.</p>
                <Link href={`/${region}/categories/${slug}`} className="btn-primary mt-5 inline-flex">Clear All Filters</Link>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => <ProductCard key={p.id} product={p} region={region} currency={currency} />)}
              </div>
            )}

            {/* Pagination placeholder */}
            {totalCount > 24 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button className="btn-outline btn-sm" disabled>← Prev</button>
                {[1,2,3,4].map((n) => (
                  <button key={n} className={`h-9 w-9 rounded text-sm font-semibold ${n === 1 ? 'bg-brand-blue text-white' : 'text-brand-gray hover:bg-brand-blue/10'}`}>{n}</button>
                ))}
                <button className="btn-outline btn-sm">Next →</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. POPULAR SUB-CATEGORY RAILS */}
      {meta.subCategories.slice(0, 3).map((sub) => (
        <section key={sub.slug} className="container-ws py-10">
          <SectionHeader
            eyebrow="Popular in"
            title={`Popular in ${sub.name}`}
            subtitle="Top-rated SKUs in this sub-category by units shipped."
            viewAllHref={`/${region}/categories/${slug}?attr_subcategory=${sub.slug}`}
            viewAllLabel={`View all ${sub.name}`}
          />
          <Rail>
            {products.slice(0, 8).map((p) => (
              <div key={`${sub.slug}-${p.id}`} className="w-[230px] md:w-[260px]"><ProductCard product={p} region={region} currency={currency} /></div>
            ))}
            {products.length === 0 && <div className="text-sm text-brand-gray italic py-4">Sample rail — populated when products exist.</div>}
          </Rail>
        </section>
      ))}

      {/* 6. BUYER'S GUIDE */}
      <section className="surface-soft border-y border-gray-200 py-12 md:py-16">
        <div className="container-ws">
          <SectionHeader eyebrow="Spec Help" title={meta.buyersGuide.title} subtitle="A 60-second primer so you can compare specs with confidence." align="center" />
          <div className="grid md:grid-cols-2 gap-5">
            {meta.buyersGuide.points.map((pt, i) => (
              <div key={pt.title} className="card p-6 flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue text-white font-bold">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <h3 className="font-bold">{pt.title}</h3>
                  <p className="mt-1 text-sm text-brand-gray leading-relaxed">{pt.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. WHY BUY FROM WATTSSTORE */}
      <section className="container-ws py-12 md:py-16">
        <SectionHeader eyebrow="Why WattsStore" title="The Specs Behind Every SKU" align="center" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { i: '📜', t: 'Product Documents', s: 'Download documents where they have been uploaded or request them before ordering.' },
            { i: '📦', t: 'Regional Availability', s: 'Variant stock and regional pricing are shown from the live catalog.' },
            { i: '💬', t: 'Sales Support', s: 'Submit a quotation request with product quantities and delivery details.' },
            { i: '🧾', t: 'Formal Quotations', s: 'Delivered quotations include line pricing and a validity period.' },
          ].map((b) => (
            <div key={b.t} className="card p-5">
              <div className="text-3xl">{b.i}</div>
              <h3 className="mt-3 font-bold">{b.t}</h3>
              <p className="mt-1 text-sm text-brand-gray leading-relaxed">{b.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. RELATED CATEGORIES */}
      <section className="surface-soft border-y border-gray-200 py-12">
        <div className="container-ws">
          <SectionHeader eyebrow="Browse More" title="Related Categories" subtitle="Customers exploring this catalog also browsed:" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {relatedCategories.filter((item) => item.slug !== slug).slice(0, 8).map((item) => (
              <CategoryTile key={item.slug} region={region} data={{ name: item.name, slug: item.slug, image: item.imageUrl ?? undefined }} />
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="container-ws py-12 md:py-20">
        <SectionHeader eyebrow="Help" title="Category FAQ" subtitle={`Quick answers for ${category?.name ?? 'this catalog'} buyers.`} align="center" />
        <div className="mx-auto max-w-3xl">
          <Accordion items={meta.faq} single={false} />
        </div>
      </section>

      {/* 10. B2B BANNER (closer) */}
      <section className="container-ws pb-14 md:pb-20">
        <BannerTile
          big
          eyebrow={categoryBanner?.eyebrow ?? 'Procurement Officers'}
          title={categoryBanner?.title ?? 'Building a project? Get a Bulk Quote.'}
          cta={categoryBanner?.ctaLabel ?? 'Submit RFQ'}
          href={(categoryBanner?.linkUrl ?? `/${region}/quote-basket`).replace(/^\/(ae|ke|de|global)(?=\/)/, `/${region}`)}
          image={categoryImage}
          tone={(categoryBanner?.tone as 'blue' | 'yellow' | 'mint' | 'violet' | 'dark') ?? 'dark'}
        />
      </section>
    </div>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <span className="font-bold text-white">{n}</span>{' '}
      <span className="text-white/70">{l}</span>
    </div>
  );
}
