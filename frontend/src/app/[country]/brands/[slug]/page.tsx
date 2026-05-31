import Link from 'next/link';
import { api } from '@/lib/api';
import { ProductCard as TProductCard } from '@/types';
import { ProductCard } from '@/components/catalog/ProductCard';
import { PageHero } from '@/components/ui/PageHero';
import { REGIONS } from '@/lib/utils';
import { resolveCurrency } from '@/lib/country';
import { loadSiteSettings, regionShowsPrice } from '@/lib/cms';

interface BrandDetail {
  brand: { id: number; name: string; slug: string; originCountry?: string | null; description?: string | null };
  products: TProductCard[];
}

export default async function BrandPage({ params }: { params: Promise<{ country: string; slug: string }> }) {
  const { country: region, slug } = await params;
  const [currency, siteSettings] = await Promise.all([resolveCurrency(region), loadSiteSettings()]);
  const showPrice = regionShowsPrice(siteSettings, region);
  const res = await api.get<BrandDetail>(`/catalog/brands/${slug}`, { country: region }).catch(() => null);

  if (!res) {
    return (
      <div>
        <PageHero crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Brands', href: `/${region}/brands` }, { label: slug }]} title="Brand not found" sub="This brand doesn't exist in our catalog yet." />
        <div className="container-ws py-10"><Link href={`/${region}/brands`} className="btn-primary">Back to brands</Link></div>
      </div>
    );
  }

  const { brand, products } = res.data;

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Brands', href: `/${region}/brands` }, { label: brand.name }]}
        eyebrow={brand.originCountry ?? 'Verified maker'}
        title={brand.name}
        sub={brand.description ?? `Browse the full ${brand.name} catalog stocked across our active regions.`}
      />
      <section className="container-ws py-10">
        {products.length === 0 ? (
          <div className="card p-10 text-center text-sm text-brand-gray">No products from this brand yet.</div>
        ) : (
          <>
            <p className="text-sm text-brand-gray mb-4">{products.length} product{products.length === 1 ? '' : 's'}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} region={region} currency={currency} showPrice={showPrice} />)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
