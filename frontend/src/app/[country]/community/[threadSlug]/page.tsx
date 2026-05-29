import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHero } from '@/components/ui/PageHero';
import { formatDate } from '@/lib/utils';

interface Reply { id: number; body: string; createdAt: string; isAcceptedAnswer: boolean; author?: { firstName: string; lastName: string } | null }
interface Thread {
  id: number; title: string; slug: string; body: string; category: string | null;
  createdAt: string; viewCount: number; replyCount: number;
  author?: { firstName: string; lastName: string } | null;
  replies: Reply[];
}

export default async function ThreadPage({ params }: { params: Promise<{ country: string; threadSlug: string }> }) {
  const { country: region, threadSlug } = await params;
  const res = await api.get<Thread>(`/community/threads/${threadSlug}`, { country: region }).catch(() => null);
  if (!res) notFound();
  const t = res.data;

  return (
    <div>
      <PageHero
        tone="violet"
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Community', href: `/${region}/community` }, { label: t.title }]}
        eyebrow={t.category ?? 'Discussion'}
        title={t.title}
        sub={`${t.replyCount} replies · ${t.viewCount} views`}
      />
      <article className="container-ws py-10 max-w-3xl">
        {/* Original post */}
        <div className="card p-6">
          <header className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white font-bold flex items-center justify-center">
              {t.author?.firstName.charAt(0) ?? '?'}
            </div>
            <div>
              <div className="text-sm font-semibold">{t.author ? `${t.author.firstName} ${t.author.lastName}` : 'Anonymous'}</div>
              <div className="text-xs text-brand-gray">{formatDate(t.createdAt)}</div>
            </div>
          </header>
          <div className="mt-4 text-sm leading-relaxed text-brand-dark whitespace-pre-wrap">{t.body}</div>
        </div>

        {/* Replies */}
        <h2 className="mt-10 mb-4 section-title">{t.replies.length} {t.replies.length === 1 ? 'reply' : 'replies'}</h2>
        <div className="space-y-3">
          {t.replies.length === 0 ? (
            <div className="card p-8 text-center text-sm text-brand-gray">No replies yet. Be the first to respond.</div>
          ) : t.replies.map((r) => (
            <div key={r.id} className={`card p-5 ${r.isAcceptedAnswer ? 'border-status-success/40 bg-status-success/5' : ''}`}>
              {r.isAcceptedAnswer && <div className="badge-success mb-2">✓ Accepted answer</div>}
              <header className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs flex items-center justify-center">
                  {r.author?.firstName.charAt(0) ?? '?'}
                </div>
                <div>
                  <div className="text-sm font-semibold">{r.author ? `${r.author.firstName} ${r.author.lastName}` : 'Anonymous'}</div>
                  <div className="text-[11px] text-brand-gray">{formatDate(r.createdAt)}</div>
                </div>
              </header>
              <div className="text-sm leading-relaxed text-brand-dark whitespace-pre-wrap">{r.body}</div>
            </div>
          ))}
        </div>

        {/* Reply CTA — opens contact / sign-in */}
        <div className="mt-8 card p-6 text-center">
          <p className="text-sm text-brand-gray">Want to reply? Sign in to join the discussion.</p>
          <Link href="/auth/login" className="btn-primary mt-3 inline-flex">Sign in to reply</Link>
        </div>

        <Link href={`/${region}/community`} className="btn-outline mt-8 inline-flex">← Back to all threads</Link>
      </article>
    </div>
  );
}
