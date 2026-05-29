import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHero } from '@/components/ui/PageHero';
import { BLOG_IMAGES } from '@/lib/images';
import { sanitizeRichHtml } from '@/lib/sanitizeHtml';

interface Post { title: string; slug: string; body: string; excerpt: string | null; category: string | null; publishedAt: string | null; author?: { firstName: string; lastName: string } | null }

export default async function BlogPostPage({ params }: { params: Promise<{ country: string; slug: string }> }) {
  const { country: region, slug } = await params;
  const res = await api.get<Post>(`/blog/${slug}`, { country: region }).catch(() => null);
  if (!res) notFound();
  const p = res.data;
  const img = (p.category && (BLOG_IMAGES as Record<string, string>)[p.category.toLowerCase()]) ?? BLOG_IMAGES.lighting;

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Blog', href: `/${region}/blog` }, { label: p.title }]}
        eyebrow={p.category ?? 'Editorial'}
        title={p.title}
        sub={p.excerpt ?? undefined}
      />
      <article className="container-ws py-12 max-w-3xl">
        <div className="aspect-banner overflow-hidden rounded-2xl mb-6">
          <img src={img} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="text-sm text-brand-gray mb-6">
          {p.author && <span>{p.author.firstName} {p.author.lastName} · </span>}
          {p.publishedAt && new Date(p.publishedAt).toLocaleDateString()}
        </div>
        <div className="prose prose-sm md:prose-base text-brand-dark" dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(p.body) }} />
        <hr className="my-10 divider-gradient" />
        <Link href={`/${region}/blog`} className="btn-outline">← Back to all articles</Link>
      </article>
    </div>
  );
}
