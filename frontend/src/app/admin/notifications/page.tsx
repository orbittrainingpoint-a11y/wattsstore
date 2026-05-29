'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface NotifRow {
  id: number;
  userId: number | null;
  channel: string;
  notificationType: string;
  subject: string | null;
  bodyPreview: string | null;
  status: string;
  referenceId: number | null;
  referenceType: string | null;
  sentAt: string | null;
  createdAt: string;
  errorMessage: string | null;
}

const STATUS_TONE: Record<string, string> = {
  pending: 'badge-warning',
  sent: 'badge-success',
  delivered: 'badge-success',
  bounced: 'badge-error',
  failed: 'badge-error',
  read: 'badge-blue',
};

function Page() {
  const params = useSearchParams();
  const initialStatus = params.get('status') ?? '';
  const [items, setItems] = useState<NotifRow[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string>(initialStatus);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (status) u.set('status', status);
    if (search) u.set('search', search);
    u.set('page', String(page));
    u.set('limit', '30');
    return u.toString();
  }, [status, search, page]);

  function load() {
    setBusy(true);
    api.get<NotifRow[]>(`/admin/notifications?${qs}`)
      .then((r) => {
        setItems(r.data);
        // @ts-expect-error summary lives on the envelope, not strictly typed in the helper
        if (r.summary) setSummary(r.summary);
      })
      .catch((e) => setMsg((e as Error).message))
      .finally(() => setBusy(false));
  }
  useEffect(load, [qs]);

  async function resend(id: number) {
    setBusy(true);
    try {
      await api.post(`/admin/notifications/${id}/resend`);
      setMsg('Notification re-queued');
      load();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">System</div>
          <h1 className="mt-1 text-3xl font-extrabold">Notifications</h1>
          <p className="text-sm text-brand-gray">Outgoing emails, in-app messages, and queue health.</p>
        </div>
        {msg && <div className="text-sm rounded-lg bg-brand-blue/10 text-brand-blue px-3 py-1.5">{msg}</div>}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        {(['pending', 'sent', 'delivered', 'failed', 'bounced'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(status === s ? '' : s)}
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
            placeholder="Search subject/recipient…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {status && (
            <button onClick={() => setStatus('')} className="btn-outline btn-sm">Clear status</button>
          )}
          <span className="text-xs text-brand-gray ml-auto">{busy ? 'Loading…' : `${items.length} rows`}</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray bg-brand-light">
            <tr>
              <th className="p-3 font-bold">Type</th>
              <th className="p-3 font-bold">Subject / recipient</th>
              <th className="p-3 font-bold">Reference</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Created</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-brand-gray">No notifications match the current filters.</td></tr>
            ) : items.map((n) => (
              <tr key={n.id} className="border-t border-gray-100 hover:bg-brand-blue/5 align-top">
                <td className="p-3"><span className="badge bg-gray-100 text-brand-gray">{n.notificationType}</span></td>
                <td className="p-3">
                  <div className="font-medium line-clamp-1">{n.subject ?? '—'}</div>
                  <div className="text-xs text-brand-gray font-mono">{n.bodyPreview}</div>
                  {n.errorMessage && <div className="text-xs text-status-error mt-1">⚠ {n.errorMessage}</div>}
                </td>
                <td className="p-3 text-xs">{n.referenceType ? `${n.referenceType} #${n.referenceId ?? '—'}` : '—'}</td>
                <td className="p-3"><span className={STATUS_TONE[n.status] ?? 'badge'}>{n.status}</span></td>
                <td className="p-3 text-xs">{formatDate(n.createdAt)}</td>
                <td className="p-3 text-right">
                  {n.status !== 'sent' && n.status !== 'delivered' && (
                    <button onClick={() => resend(n.id)} className="btn-outline btn-sm" disabled={busy}>Resend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
        <span className="text-brand-gray">Page {page}</span>
        <button className="btn-outline btn-sm" onClick={() => setPage((p) => p + 1)} disabled={items.length < 30}>Next →</button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-sm text-brand-gray">Loading…</div>}>
      <Page />
    </Suspense>
  );
}
