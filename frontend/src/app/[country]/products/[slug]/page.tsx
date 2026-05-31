import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { ProductDetail } from '@/types';
import { ProductView } from '@/components/pdp/ProductView';
import { RatingStars } from '@/components/ui/RatingStars';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Accordion } from '@/components/ui/Accordion';
import { Rail } from '@/components/ui/Rail';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CategoryTile } from '@/components/catalog/CategoryTile';
import { RecentlyViewedRail } from '@/components/catalog/RecentlyViewedRail';
import { REGIONS } from '@/lib/utils';
import { resolveCurrency } from '@/lib/country';
import { loadSiteSettings, regionShowsPrice } from '@/lib/cms';
import { DynamicPromoBanner } from '@/components/ui/DynamicPromoBanner';
import { sanitizeRichHtml } from '@/lib/sanitizeHtml';
import { ReviewForm } from '@/components/pdp/ReviewForm';

interface ApiCategory {
  name: string;
  slug: string;
  imageUrl?: string | null;
}

interface ApiReview {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

async function getProduct(region: string, slug: string): Promise<ProductDetail | null> {
  try { return (await api.get<ProductDetail>(`/catalog/products/${slug}`, { country: region })).data; }
  catch { return null; }
}

export async function generateMetadata({ params }: { params: Promise<{ country: string; slug: string }> }): Promise<Metadata> {
  const { country, slug } = await params;
  const product = await getProduct(country, slug);
  if (!product) return { title: 'Product not found | WattsStore' };
  return {
    title: product.metaTitle ?? `${product.title} | WattsStore`,
    description: product.shortDescription ?? undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ country: string; slug: string }> }) {
  const { country: region, slug } = await params;
  const currency = await resolveCurrency(region);
  const product = await getProduct(region, slug);
  if (!product) notFound();
  const [categories, reviewRows, siteSettings] = await Promise.all([
    api.get<ApiCategory[]>('/catalog/categories', { country: region }).then((res) => res.data).catch(() => []),
    api.get<ApiReview[]>(`/catalog/products/${slug}/reviews?limit=3&sort=helpful`, { country: region }).then((res) => res.data).catch(() => []),
    loadSiteSettings(),
  ]);
  const showPrice = regionShowsPrice(siteSettings, region);
  const reviews = reviewRows.map((review) => ({
    name: `${review.user.firstName} ${review.user.lastName.charAt(0)}.`,
    role: review.isVerifiedPurchase ? 'Verified customer' : 'Customer',
    date: new Date(review.createdAt).toLocaleDateString(),
    rating: review.rating,
    title: review.title ?? 'Product feedback',
    body: review.body ?? '',
    verified: review.isVerifiedPurchase,
    helpful: review.helpfulCount,
  }));

  const cross = product.crossSells ?? [];
  const variantSpecs = product.variants[0] ? Object.entries(product.variants[0].attributes as Record<string, string>) : [];
  const featureItems = product.keyFeatures?.length
    ? product.keyFeatures
    : variantSpecs.slice(0, 8).map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`);
  const glanceItems = [
    ['Category', product.category.name],
    ['Brand', product.brand?.name ?? 'Not specified'],
    ['Variants', `${product.variants.length} option${product.variants.length === 1 ? '' : 's'}`],
    ['Documents', product.documents?.length ? `${product.documents.length} file${product.documents.length === 1 ? '' : 's'}` : 'Contact sales'],
  ];
  const productFaq = (product.faqs ?? []).map((faq) => ({ q: faq.question, a: faq.answer }));
  const relatedSearches = [...new Set([product.category.name, product.brand?.name, ...variantSpecs.slice(0, 4).map(([, value]) => String(value))].filter((item): item is string => Boolean(item)))];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="container-ws pt-5">
        <Breadcrumb items={[
          { label: 'Home', href: `/${region}` },
          { label: 'Catalog', href: `/${region}` },
          { label: product.category.name, href: `/${region}/categories/${product.category.slug}` },
          { label: product.title },
        ]} />
      </div>

      {/* 1. PRODUCT OVERVIEW — gallery + sticky buy box */}
      <section className="container-ws py-6">
        <ProductView product={product} region={region} currency={currency} showPrice={showPrice} />
      </section>

      {/* 2. AT A GLANCE — quick highlights strip */}
      <section className="surface-soft border-y border-gray-200 py-6">
        <div className="container-ws grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {glanceItems.map(([title, sub]) => (
            <div key={title} className="flex items-center gap-3 rounded bg-white border border-gray-200 p-3">
              <div>
                <div className="font-bold text-brand-dark">{title}</div>
                <div className="text-brand-gray">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. KEY FEATURES + SPECIFICATIONS — 2-column */}
      <section className="container-ws py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <SectionHeader eyebrow="Engineered Specs" title="Key Features" />
            <ul className="space-y-3">
              {featureItems.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold">✓</span>
                  <span className="text-brand-dark leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>
            {featureItems.length === 0 && <p className="text-sm text-brand-gray">Technical attributes have not yet been uploaded for this product.</p>}
          </div>

          <div>
            <SectionHeader eyebrow="Technical Data" title="Product Specifications" />
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {variantSpecs.length > 0 ? variantSpecs.map(([k, v], i) => (
                    <tr key={k} className={i % 2 ? 'bg-brand-light' : ''}>
                      <td className="px-4 py-3 font-medium capitalize w-1/2 border-b border-gray-100">{k.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 font-mono text-brand-dark border-b border-gray-100">{v}</td>
                    </tr>
                  )) : (
                    <tr><td className="p-4 text-brand-gray text-sm">Specifications unavailable — variants pending.</td></tr>
                  )}
                  <tr className={variantSpecs.length % 2 ? 'bg-brand-light' : ''}><td className="px-4 py-3 font-medium border-b border-gray-100">Brand</td><td className="px-4 py-3 font-mono border-b border-gray-100">{product.brand?.name ?? '—'}</td></tr>
                  <tr className={(variantSpecs.length + 1) % 2 ? 'bg-brand-light' : ''}><td className="px-4 py-3 font-medium border-b border-gray-100">Origin</td><td className="px-4 py-3 font-mono border-b border-gray-100">{product.brandOrigin ?? '—'}</td></tr>
                  <tr className={(variantSpecs.length + 2) % 2 ? 'bg-brand-light' : ''}><td className="px-4 py-3 font-medium border-b border-gray-100">Category</td><td className="px-4 py-3 font-mono border-b border-gray-100">{product.category.name}</td></tr>
                  <tr className={(variantSpecs.length + 3) % 2 ? 'bg-brand-light' : ''}><td className="px-4 py-3 font-medium">Country of Origin</td><td className="px-4 py-3 font-mono">{product.brandOrigin ?? '—'}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {(product.documents ?? []).map((doc) => (
                <a key={doc.id} className="btn-outline btn-sm" href={doc.fileUrl} target="_blank" rel="noreferrer">{doc.title}</a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT DETAILS — long-form description */}
      <section className="surface-soft border-y border-gray-200 py-12 md:py-16">
        <div className="container-ws max-w-4xl">
          <SectionHeader eyebrow="Deep Dive" title="About this Product" />
          <div className="prose prose-sm md:prose-base text-brand-dark leading-relaxed space-y-4">
            {product.fullDescription ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.fullDescription) }} />
            ) : (
              <p>No extended product description has been uploaded. Review the listed variant specifications or request technical information from the sales team.</p>
            )}
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY BOUGHT TOGETHER (cross-sell) */}
      <section className="container-ws py-12 md:py-16">
        <SectionHeader
          eyebrow="Pairs Well With"
          title="Frequently Bought Together"
          subtitle="Customers buying this product often add these complementary SKUs."
          viewAllHref={`/${region}/categories/${product.category.slug}`}
          viewAllLabel="See More"
        />
        {cross.length > 0 ? (
          <Rail>
            {cross.map((p) => (
              <div key={p.id} className="w-[230px] md:w-[260px]"><ProductCard product={p} region={region} currency={currency} /></div>
            ))}
          </Rail>
        ) : (
          <div className="card p-8 text-center text-sm text-brand-gray">Cross-sell suggestions appear once an admin links related products.</div>
        )}
      </section>

      {/* 6. REVIEWS & RATINGS */}
      <section id="reviews" className="container-ws py-12 md:py-20">
        <SectionHeader
          eyebrow="Verified Buyers"
          title="Reviews & Ratings"
          subtitle="Approved customer feedback for this product."
        />

        <div className="card p-6 md:p-8 flex items-center gap-4">
          <div className="text-3xl font-extrabold">{product.averageRating != null ? product.averageRating.toFixed(1) : '—'}</div>
          <div><RatingStars value={product.averageRating ?? 0} /><p className="mt-1 text-xs text-brand-gray">{product.reviewCount} approved review{product.reviewCount === 1 ? '' : 's'}</p></div>
        </div>

        <div className="mt-6 space-y-4">
          {reviews.map((r, i) => (
            <article key={i} className="card p-6">
              <header className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white font-bold">
                  {r.name.split(' ').map((s) => s[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.name}</span>
                    <span className="text-xs text-brand-gray">· {r.role}</span>
                    {r.verified && <span className="badge-success">✓ Verified Purchase</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <RatingStars value={r.rating} />
                    <span className="text-brand-gray">{r.date}</span>
                  </div>
                </div>
              </header>
              <h4 className="mt-3 font-bold">{r.title}</h4>
              <p className="mt-1 text-sm text-brand-gray leading-relaxed">{r.body}</p>
              <div className="mt-3 text-xs text-brand-gray">{r.helpful} customers found this helpful</div>
            </article>
          ))}
          {reviews.length === 0 && <div className="card p-8 text-center text-sm text-brand-gray">No approved product reviews yet.</div>}
        </div>
        <ReviewForm productId={product.id} />

      </section>

      {/* 7. Q&A / FAQ */}
      <section className="surface-soft border-y border-gray-200 py-12 md:py-16">
        <div className="container-ws max-w-3xl">
          <SectionHeader
            eyebrow="Buyer Q&A"
            title="Frequently Asked Questions"
            subtitle="Practical next steps before submitting an order or quotation."
            align="center"
          />
          {productFaq.length > 0 ? (
            <Accordion items={productFaq} single={false} />
          ) : (
            <div className="card p-8 text-center text-sm text-brand-gray">No product FAQ has been added yet.</div>
          )}
          <div className="mt-6 text-center">
            <p className="text-sm text-brand-gray">Still have a question?</p>
            <Link href={`/${region}/contact`} className="btn-primary mt-3 inline-flex">Ask the WattsStore Team</Link>
          </div>
        </div>
      </section>

      {/* 8. RELATED SEARCHES */}
      <section className="container-ws py-10">
        <SectionHeader eyebrow="Discover" title="Related Searches" />
        <div className="flex flex-wrap gap-2">
          {relatedSearches.map((q) => (
            <Link
              key={q}
              href={`/${region}/search?q=${encodeURIComponent(q)}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue transition"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      {/* 10. SHOP BY RELATED CATEGORIES */}
      <section className="surface-soft border-y border-gray-200 py-12">
        <div className="container-ws">
          <SectionHeader
            eyebrow="Browse More"
            title="Shop By Related Categories"
            subtitle="Customers viewing this product also explored these catalogs."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {categories.filter((category) => category.slug !== product.category.slug).slice(0, 8).map((category) => (
              <CategoryTile key={category.slug} region={region} data={{ name: category.name, slug: category.slug, image: category.imageUrl ?? undefined }} />
            ))}
          </div>
        </div>
      </section>

      {/* 11. RECENTLY VIEWED — persisted in localStorage */}
      <RecentlyViewedRail
        region={region}
        recordVisit={{ slug: product.slug, title: product.title, image: product.images[0]?.url ?? null, productId: product.id }}
      />

      {/* 12. CMS-managed B2B CTA closer */}
      <section className="container-ws pb-14 md:pb-20">
        <DynamicPromoBanner
          region={region}
          placement="pdp"
          big
          fallback={{ eyebrow: 'Bulk Pricing', title: 'Need 10+ units? Get a Bulk Quote.', cta: 'Add to Quote Basket', href: `/${region}/quote-basket`, image: '/img/banners/cms/power-control.jpg', tone: 'dark' }}
        />
      </section>
    </div>
  );
}
