import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';
import { api } from '@/lib/api';

interface Thread {
  id: number;
  title: string;
  slug: string;
  category: string | null;
  viewCount: number;
  replyCount: number;
  author?: { firstName: string; lastName: string } | null;
}

export default async function CommunityPage({ params }: { params: Promise<{ country: string }> }) {
  const region = (await params).country;
  const res = await api.get<Thread[]>('/community/threads', { country: region }).catch(() => null);
  const threads = res?.data ?? [];

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Community' }]}
        tone="violet"
        eyebrow="Field-engineer forum"
        title={<>The WattsStore<br/><span className="text-gradient-on-dark">Community.</span></>}
        sub="Ask sizing questions, share project showcases, troubleshoot installs — moderated by our engineers."
      />
      <section className="container-ws py-12">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <h2 className="section-title">Recent threads</h2>
          <Link href={`/${region}/contact`} className="btn-primary btn-sm">+ Start a Thread</Link>
        </div>
        {threads.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl">💬</div>
            <p className="mt-3 font-semibold">No threads yet</p>
            <p className="mt-1 text-sm text-brand-gray">Be the first to start a discussion.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {threads.map((t) => (
              <Link key={t.id} href={`/${region}/community/${t.slug}`} className="card card-hover p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white flex items-center justify-center font-bold">
                  {t.author?.firstName.charAt(0) ?? '?'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-xs text-brand-gray">{t.category ?? 'General'} · {t.author ? `${t.author.firstName} ${t.author.lastName}` : 'Anon'}</div>
                </div>
                <div className="text-xs text-brand-gray">{t.replyCount} replies · {t.viewCount} views</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
