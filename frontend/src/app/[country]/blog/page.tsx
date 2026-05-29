import Link from 'next/link';
import { api } from '@/lib/api';
import { PageHero } from '@/components/ui/PageHero';
import { BLOG_IMAGES } from '@/lib/images';

interface BlogPost { title: string; slug: string; excerpt: string | null; category: string | null; tags: string[]; publishedAt: string | null }

const IMAGE_BY_CAT: Record<string, string> = {
  Lighting: BLOG_IMAGES.lighting,
  Solar: BLOG_IMAGES.solar,
  B2B: BLOG_IMAGES.b2b,
};

export default async function BlogPage({ params }: { params: Promise<{ country: string }> }) {
  const region = (await params).country;
  const res = await api.get<BlogPost[]>('/blog?limit=24', { country: region }).catch(() => null);
  const posts = res?.data ?? [];

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Blog' }]}
        eyebrow="WattsStore editorial"
        title={<>Spec sheets, demystified.<br/><span className="text-gradient-on-dark">For procurement & engineers.</span></>}
        sub="Product guidance and procurement updates published by the WattsStore content team."
      />

      <section className="container-ws py-12">
        {posts.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl">📝</div>
            <h2 className="mt-3 font-bold">No published articles yet</h2>
            <p className="mt-1 text-sm text-brand-gray">We're warming up the editorial desk. Check back soon.</p>
            <Link href={`/${region}`} className="btn-primary mt-5 inline-flex">Back to home</Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {posts.map((p) => {
              const img = (p.category && IMAGE_BY_CAT[p.category]) ?? BLOG_IMAGES.lighting;
              return (
                <Link key={p.slug} href={`/${region}/blog/${p.slug}`} className="card card-hover group overflow-hidden flex flex-col">
                  <div className="aspect-banner relative overflow-hidden">
                    <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    {p.category && <span className="absolute top-3 left-3 badge bg-white text-brand-blue">{p.category}</span>}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-base leading-snug group-hover:text-brand-blue line-clamp-2">{p.title}</h3>
                    {p.excerpt && <p className="mt-2 text-xs text-brand-gray line-clamp-3">{p.excerpt}</p>}
                    <div className="mt-auto pt-3 text-xs text-brand-gray">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : 'WattsStore Editorial'}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
