import Link from 'next/link';
import { api } from '@/lib/api';
import { REGIONS } from '@/lib/utils';
import { resolveCurrency } from '@/lib/country';
import { HERO_IMAGES, TRUST_ICONS, BLOG_IMAGES } from '@/lib/images';
import { loadBanners, loadSiteSettings, loadTestimonials, CmsBanner } from '@/lib/cms';
import { ProductCard as TProductCard } from '@/types';
import type { CategoryTileData } from '@/components/catalog/CategoryTile';
import type { BrandTileData } from '@/components/catalog/BrandTile';
import { ProductCard } from '@/components/catalog/ProductCard';
import { CategoryTile } from '@/components/catalog/CategoryTile';
import { BrandTile } from '@/components/catalog/BrandTile';
import { HeroSlider, HeroSlide } from '@/components/home/HeroSlider';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Rail } from '@/components/ui/Rail';
import { RatingStars } from '@/components/ui/RatingStars';
import { Accordion } from '@/components/ui/Accordion';
import { BannerTile } from '@/components/ui/BannerTile';
import { StatPill } from '@/components/ui/StatPill';

interface FeaturedSections {
  featured: TProductCard[];
  newArrivals: TProductCard[];
  bestSellers: TProductCard[];
}
interface ApiCategory { id: number; name: string; slug: string; imageUrl?: string | null }
interface ApiBrand { name: string; slug: string; originCountry?: string | null }
interface BlogPost { title: string; slug: string; category: string | null; coverImageUrl?: string | null; publishedAt: string | null }
interface ApiFaqItem { question: string; answer: string }
type ApiFaq = Record<string, ApiFaqItem[]>;

const HERO_FALLBACK: HeroSlide[] = [
  {
    eyebrow: 'Industrial / Live',
    title: <>Built for the <span className="text-brand-yellow">work site</span>.</>,
    sub: 'Certified industrial lighting, electrical and solar equipment for serious projects.',
    primary: { label: 'Explore the Catalog', href: '/ae/categories/industrial-lighting' },
    bg: 'bg-gradient-to-br from-[#0a1b36] via-[#1e4d8c] to-[#0a1b36]',
    image: HERO_IMAGES.industrial,
  },
];

const TONE_TO_BG: Record<string, string> = {
  blue: 'bg-gradient-to-br from-[#0a1b36] via-[#1e4d8c] to-[#0a1b36]',
  mint: 'bg-gradient-to-br from-[#062c22] via-emerald-700 to-[#062c22]',
  violet: 'bg-gradient-to-br from-[#23163a] via-[#3b2a86] to-[#23163a]',
  yellow: 'bg-gradient-to-br from-[#3a2200] via-amber-700 to-[#1f1300]',
};
const TONES = ['blue', 'mint', 'violet', 'yellow'] as const;

function localLink(href: string | null, region: string) {
  return (href ?? '#').replace(/^\/(ae|ke|de|global)(?=\/)/, `/${region}`);
}

function heroFromCms(banner: CmsBanner, region: string): HeroSlide {
  return {
    eyebrow: banner.eyebrow ?? 'Featured',
    title: <>{banner.title ?? ''}</>,
    sub: banner.subtitle ?? '',
    primary: { label: banner.ctaLabel ?? 'Explore', href: localLink(banner.linkUrl, region) },
    bg: TONE_TO_BG[banner.tone ?? 'blue'] ?? TONE_TO_BG.blue,
    image: banner.imageUrl,
  };
}

function tileFromCms(banner: CmsBanner, region: string, index: number) {
  return {
    tone: ((banner.tone as typeof TONES[number]) ?? TONES[index % TONES.length]),
    image: banner.imageUrl,
    eyebrow: banner.eyebrow ?? 'Featured',
    title: banner.title ?? '',
    cta: banner.ctaLabel ?? 'Explore',
    href: localLink(banner.linkUrl, region),
  };
}

async function loadHomeData(region: string) {
  const [products, categories, brands, posts, catalog, faq] = await Promise.all([
    api.get<FeaturedSections>('/catalog/featured', { country: region }).then((r) => r.data).catch(() => null),
    api.get<ApiCategory[]>('/catalog/categories', { country: region }).then((r) => r.data).catch(() => []),
    api.get<ApiBrand[]>('/catalog/brands?featured=true', { country: region }).then((r) => r.data).catch(() => []),
    api.get<BlogPost[]>('/blog?limit=3', { country: region }).then((r) => r.data).catch(() => []),
    api.get<TProductCard[]>('/catalog/products?limit=1', { country: region }).then((r) => r.meta?.totalCount ?? r.data.length).catch(() => 0),
    api.get<ApiFaq>('/faq', { country: region }).then((r) => r.data).catch(() => ({})),
  ]);
  const solarCategory = categories.find((item) => item.slug.includes('solar'));
  const solarProducts = solarCategory
    ? await api.get<TProductCard[]>(`/catalog/products?catId=${solarCategory.id}&limit=8`, { country: region }).then((r) => r.data).catch(() => [])
    : [];
  const categoryTiles: CategoryTileData[] = categories.slice(0, 8).map((item) => ({
    name: item.name,
    slug: item.slug,
    image: item.imageUrl ?? undefined,
  }));
  const brandTiles: BrandTileData[] = brands.slice(0, 12).map((item) => ({
    name: item.name,
    slug: item.slug,
    origin: item.originCountry === 'India' ? 'Indian' : item.originCountry === 'China' ? 'Chinese' : item.originCountry === 'Germany' ? 'German' : undefined,
  }));
  const faqItems = Object.values(faq).flat().slice(0, 6).map((item) => ({ q: item.question, a: item.answer }));
  return { products, solarProducts, categoryTiles, brandTiles, posts, productCount: catalog, faqItems };
}

export default async function HomePage({ params }: { params: Promise<{ country: string }> }) {
  const region = (await params).country;
  const currency = await resolveCurrency(region);
  const [home, hero, mosaic, strip, promo, testimonials, settings] = await Promise.all([
    loadHomeData(region),
    loadBanners('home_hero', region),
    loadBanners('home_mosaic', region),
    loadBanners('home_strip', region),
    loadBanners('home_promo', region),
    loadTestimonials(region),
    loadSiteSettings(),
  ]);
  const allProducts = [
    ...(home.products?.featured ?? []),
    ...(home.products?.newArrivals ?? []),
    ...(home.products?.bestSellers ?? []),
  ];
  const trustBadges = settings?.trustBadges ?? [
    { image: TRUST_ICONS.delivery, label: 'Regional Catalog' },
    { image: TRUST_ICONS.warranty, label: 'Product Documents' },
    { image: TRUST_ICONS.quote, label: 'B2B Quotes' },
    { image: TRUST_ICONS.certified, label: 'Certified' },
    { image: TRUST_ICONS.secure, label: 'Secure' },
    { image: TRUST_ICONS.regions, label: '4 Regions' },
  ];

  return (
    <div>
      <HeroSlider
        slides={hero.length ? hero.map((item) => heroFromCms(item, region)) : HERO_FALLBACK}
        proofPoints={[`${home.productCount}+ Products`, `${home.brandTiles.length}+ Brands`, `${home.categoryTiles.length} Categories`, 'RFQ Ready']}
      />

      <section className="surface-soft border-b border-gray-200">
        <div className="container-ws grid grid-cols-3 md:grid-cols-6 gap-2 py-5">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="flex items-center justify-center gap-3 rounded-xl bg-white border border-gray-200 px-3 py-2.5">
              {badge.image && <img src={badge.image} alt="" className="h-8 w-8" />}
              <span className="text-xs font-semibold text-brand-dark">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="container-ws py-14 md:py-20">
        <SectionHeader eyebrow="Catalog" title="Shop by Category" viewAllHref={`/${region}/search?q=`} viewAllLabel="View all" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {home.categoryTiles.map((item) => <CategoryTile key={item.slug} region={region} data={item} />)}
        </div>
      </section>

      <section className="container-ws pb-14">
        <SectionHeader eyebrow="Procurement paths" title="Main Category Routes" viewAllHref={`/${region}/search?q=`} viewAllLabel="Browse catalog" />
        <Rail>
          {home.categoryTiles.map((item) => (
            <Link
              key={item.slug}
              href={`/${region}/categories/${item.slug}`}
              className="group relative h-40 w-[260px] shrink-0 overflow-hidden rounded-2xl border border-white/70 bg-brand-blue text-white shadow-soft"
            >
              {item.image && <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-br from-[#071321]/90 via-[#071321]/52 to-transparent" />
              <div className="relative flex h-full flex-col justify-between p-5">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-yellow">Category</div>
                <div>
                  <h3 className="text-lg font-extrabold leading-tight">{item.name}</h3>
                  <span className="mt-3 inline-flex text-xs font-bold text-white/90">Explore range -&gt;</span>
                </div>
              </div>
            </Link>
          ))}
        </Rail>
      </section>

      {mosaic.length > 0 && (
        <section className="container-ws pb-10 md:pb-14">
          <SectionHeader eyebrow="Made for" title="Pick your stack" />
          <div className="grid gap-4 md:grid-cols-12 md:auto-rows-[176px]">
            {mosaic.map((item, index) => (
              <div key={item.id} className={index === 0 ? 'md:col-span-7 md:row-span-2' : index < 3 ? 'md:col-span-5' : 'md:col-span-4'}>
                <BannerTile {...tileFromCms(item, region, index)} big={index === 0} compact={index !== 0} />
              </div>
            ))}
          </div>
        </section>
      )}

      <ProductSection title="Best Sellers" products={home.products?.bestSellers ?? allProducts} region={region} currency={currency} />

      {strip.length > 0 && (
        <section className="container-ws pb-14 md:pb-20">
          <SectionHeader eyebrow="By segment" title="Tailored for the field" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {strip.map((item, index) => <BannerTile key={item.id} {...tileFromCms(item, region, index)} />)}
          </div>
        </section>
      )}

      <ProductSection title="New Arrivals" products={home.products?.newArrivals ?? allProducts} region={region} currency={currency} />

      <ProductSection title="Solar Project Picks" products={home.solarProducts.length ? home.solarProducts : allProducts.slice(0, 8)} region={region} currency={currency} />

      {promo.length > 0 && (
        <section className="container-ws pb-14 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-4">
            {promo.map((item, index) => <BannerTile key={item.id} {...tileFromCms(item, region, index)} big />)}
          </div>
        </section>
      )}

      <section className="surface-soft border-y border-gray-200 py-14 md:py-20">
        <div className="container-ws">
          <SectionHeader eyebrow="Verified" title="Featured Brands" viewAllHref={`/${region}/brands`} viewAllLabel="All brands" />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {home.brandTiles.map((brand) => <BrandTile key={brand.slug} region={region} brand={brand} />)}
          </div>
        </div>
      </section>

      <section className="container-ws py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <StatPill value={`${home.productCount}+`} label="Products" />
          <StatPill value={`${home.brandTiles.length}+`} label="Brands" accent="yellow" />
          <StatPill value={`${home.categoryTiles.length}`} label="Categories" accent="mint" />
          <StatPill value="98%" label="On-time" />
          <StatPill value="B2B" label="RFQ Ready" accent="yellow" />
          <StatPill value="4.7" label="Rated" accent="mint" />
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="container-ws pb-14">
          <SectionHeader eyebrow="Real buyers" title="Trusted by field engineers" align="center" />
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.id} className="card p-6">
                <RatingStars value={testimonial.rating} size="md" />
                <blockquote className="mt-3 text-sm leading-relaxed text-brand-dark">&ldquo;{testimonial.quote}&rdquo;</blockquote>
                <figcaption className="mt-5 pt-4 border-t border-gray-100 text-sm font-semibold">
                  {testimonial.name}
                  <div className="text-xs font-normal text-brand-gray">{[testimonial.role, testimonial.company].filter(Boolean).join(', ')}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <ProductSection title="Featured Products" products={home.products?.featured ?? allProducts} region={region} currency={currency} />

      <section className="surface-soft border-y border-gray-200 py-14 md:py-20">
        <div className="container-ws">
          <SectionHeader eyebrow="Insights" title="From the Editorial Desk" viewAllHref={`/${region}/blog`} viewAllLabel="All articles" />
          <div className="grid gap-5 md:grid-cols-3">
            {home.posts.map((post) => (
              <Link href={`/${region}/blog/${post.slug}`} key={post.slug} className="card card-hover group overflow-hidden">
                <div className="aspect-banner relative overflow-hidden">
                  <img src={post.coverImageUrl ?? BLOG_IMAGES.lighting} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {post.category && <span className="absolute top-3 left-3 badge bg-white text-brand-blue">{post.category}</span>}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-base group-hover:text-brand-blue">{post.title}</h3>
                  <div className="mt-3 text-xs text-brand-gray">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'WattsStore Editorial'}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-ws py-14 md:py-20">
        <SectionHeader eyebrow="Help" title="Common Questions" align="center" />
        <div className="mx-auto max-w-3xl"><Accordion items={home.faqItems} single={false} /></div>
      </section>
    </div>
  );
}

function ProductSection({ title, products, region, currency }: { title: string; products: TProductCard[]; region: string; currency: string }) {
  if (!products.length) return null;
  return (
    <section className="container-ws py-12">
      <SectionHeader eyebrow="Catalog" title={title} viewAllHref={`/${region}/search?q=`} viewAllLabel="See all" />
      <Rail>
        {products.map((product) => (
          <div key={product.id} className="w-[230px] md:w-[260px]">
            <ProductCard product={product} region={region} currency={currency} />
          </div>
        ))}
      </Rail>
    </section>
  );
}
