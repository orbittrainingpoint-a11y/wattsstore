'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface ReviewRow {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  status: 'pending' | 'approved' | 'rejected';
  isVerifiedPurchase: boolean;
  adminNote: string | null;
  helpfulCount: number;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; email: string };
  product: { id: number; title: string; slug: string };
}

const STATUS_TONE: Record<string, string> = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-error',
};

export default function ReviewsModerationPage() {
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [status, setStatus] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [reply, setReply] = useState<{ id: number; text: string } | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (status) u.set('status', status);
    if (search) u.set('search', search);
    u.set('page', String(page));
    u.set('limit', '20');
    return u.toString();
  }, [status, search, page]);

  function load() {
    setBusy(true);
    api.get<ReviewRow[]>(`/admin/reviews?${qs}`)
      .then((r) => {
        setItems(r.data);
        // @ts-expect-error summary lives on envelope
        if (r.summary) setSummary(r.summary);
      })
      .catch((e) => setMsg((e as Error).message))
      .finally(() => setBusy(false));
  }
  useEffect(load, [qs]);

  async function moderate(id: number, action: 'approve' | 'reject', reason?: string) {
    setBusy(true);
    try {
      await api.put(`/admin/reviews/${id}/moderate`, { action, reason });
      setMsg(`Review ${action}d`);
      load();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  async function sendReply(id: number, text: string) {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.put(`/admin/reviews/${id}/reply`, { reply: text });
      setReply(null);
      setMsg('Reply posted');
      load();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Marketing</div>
          <h1 className="mt-1 text-3xl font-extrabold">Reviews moderation</h1>
          <p className="text-sm text-brand-gray">Approve, reject, or reply to customer reviews.</p>
        </div>
        {msg && <div className="text-sm rounded-lg bg-brand-blue/10 text-brand-blue px-3 py-1.5">{msg}</div>}
      </header>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['pending', 'approved', 'rejected'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`card p-3 text-left transition ${status === s ? 'ring-2 ring-brand-blue/40' : 'hover:shadow-modal'}`}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{s}</div>
            <div className="mt-1 text-xl font-extrabold">{summary[s] ?? 0}</div>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-gray-100">
          <input
            className="input max-w-xs"
            placeholder="Search title or body…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <span className="text-xs text-brand-gray ml-auto">{busy ? 'Loading…' : `${items.length} reviews`}</span>
        </div>

        <ul className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <li className="p-10 text-center text-brand-gray">No reviews in this bucket.</li>
          ) : items.map((r) => (
            <li key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={STATUS_TONE[r.status]}>{r.status}</span>
                    {r.isVerifiedPurchase && <span className="badge-success">Verified purchase</span>}
                    <span className="text-amber-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="text-xs text-brand-gray">· {formatDate(r.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 font-extrabold">{r.title || '(no title)'}</h3>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-brand-dark">{r.body || '(no body)'}</p>
                  <div className="mt-3 text-xs text-brand-gray">
                    <span className="font-semibold text-brand-dark">{r.user.firstName} {r.user.lastName}</span>
                    {' · '}
                    <span>{r.user.email}</span>
                    {' · on '}
                    <a className="link-underline text-brand-blue" href={`/admin/catalog/products/${r.product.id}/edit`}>{r.product.title}</a>
                  </div>
                  {r.adminNote && (
                    <div className="mt-3 rounded-lg bg-brand-blue/5 p-3 text-sm">
                      <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-blue">Admin reply / note</div>
                      <div className="mt-1 whitespace-pre-wrap">{r.adminNote}</div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {r.status === 'pending' && (
                    <>
                      <button onClick={() => moderate(r.id, 'approve')} className="btn-primary btn-sm" disabled={busy}>Approve</button>
                      <button onClick={() => { const reason = prompt('Reason for rejection (optional)') ?? undefined; moderate(r.id, 'reject', reason); }} className="btn-outline btn-sm" disabled={busy}>Reject</button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <button onClick={() => moderate(r.id, 'reject')} className="btn-outline btn-sm" disabled={busy}>Un-approve</button>
                  )}
                  {r.status === 'rejected' && (
                    <button onClick={() => moderate(r.id, 'approve')} className="btn-outline btn-sm" disabled={busy}>Re-approve</button>
                  )}
                  <button onClick={() => setReply({ id: r.id, text: r.adminNote ?? '' })} className="btn-ghost btn-sm">Reply</button>
                </div>
              </div>

              {reply?.id === r.id && (
                <div className="mt-3 card p-3 bg-brand-light">
                  <textarea
                    className="input min-h-[80px]"
                    placeholder="Public reply to the customer…"
                    value={reply.text}
                    onChange={(e) => setReply({ id: r.id, text: e.target.value })}
                  />
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={() => setReply(null)} className="btn-outline btn-sm">Cancel</button>
                    <button onClick={() => sendReply(r.id, reply.text)} className="btn-primary btn-sm" disabled={busy}>Post reply</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
        <span className="text-brand-gray">Page {page}</span>
        <button className="btn-outline btn-sm" onClick={() => setPage((p) => p + 1)} disabled={items.length < 20}>Next →</button>
      </div>
    </div>
  );
}
