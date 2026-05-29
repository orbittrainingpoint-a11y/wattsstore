'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Actor { id: number; email: string; firstName: string; lastName: string; role: string }
interface AuditRow {
  id: number;
  actor: Actor | null;
  action: string;
  entityType: string;
  entityId: number | null;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_TONE: Record<string, string> = {
  create: 'badge-success',
  update: 'badge-blue',
  delete: 'badge-error',
  approve: 'badge-success',
  reject: 'badge-error',
  override: 'badge-warning',
  reply: 'badge-blue',
};

function actionTone(action: string) {
  for (const key of Object.keys(ACTION_TONE)) if (action.includes(key)) return ACTION_TONE[key];
  return 'badge bg-gray-100 text-brand-gray';
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditRow[]>([]);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (entityType) u.set('entityType', entityType);
    if (action) u.set('action', action);
    u.set('page', String(page));
    u.set('limit', '50');
    return u.toString();
  }, [entityType, action, page]);

  useEffect(() => {
    setBusy(true);
    api.get<AuditRow[]>(`/admin/audit-log?${qs}`)
      .then((r) => setItems(r.data))
      .catch((e) => setError((e as Error).message))
      .finally(() => setBusy(false));
  }, [qs]);

  return (
    <div>
      <header className="mb-5">
        <div className="section-eyebrow">System</div>
        <h1 className="mt-1 text-3xl font-extrabold">Audit Log</h1>
        <p className="text-sm text-brand-gray">Append-only record of every privileged admin action.</p>
      </header>

      {error && <div className="card p-4 mb-4 text-status-error">⚠ {error}</div>}

      <div className="card overflow-hidden">
        <div className="p-4 flex flex-wrap items-center gap-2 border-b border-gray-100">
          <select className="input max-w-[200px]" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
            <option value="">All entity types</option>
            <option value="order">Order</option>
            <option value="bulk_quote">Bulk quote</option>
            <option value="product">Product</option>
            <option value="user">User</option>
            <option value="coupon">Coupon</option>
            <option value="product_review">Review</option>
          </select>
          <input
            className="input max-w-xs"
            placeholder="Action contains…"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          />
          <span className="text-xs text-brand-gray ml-auto">{busy ? 'Loading…' : `${items.length} rows`}</span>
        </div>

        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray bg-brand-light">
            <tr>
              <th className="p-3 font-bold">When</th>
              <th className="p-3 font-bold">Actor</th>
              <th className="p-3 font-bold">Action</th>
              <th className="p-3 font-bold">Entity</th>
              <th className="p-3 font-bold">IP</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-brand-gray">No audit events match the current filters.</td></tr>
            ) : items.map((r) => (
              <>
                <tr key={r.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-3 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                  <td className="p-3">
                    {r.actor ? (
                      <div>
                        <div className="font-medium">{r.actor.firstName} {r.actor.lastName}</div>
                        <div className="text-xs text-brand-gray">{r.actor.role}</div>
                      </div>
                    ) : <span className="text-xs text-brand-gray italic">system</span>}
                  </td>
                  <td className="p-3"><span className={`badge ${actionTone(r.action)}`}>{r.action}</span></td>
                  <td className="p-3 text-xs font-mono">{r.entityType}{r.entityId ? ` #${r.entityId}` : ''}</td>
                  <td className="p-3 text-xs font-mono text-brand-gray">{r.ipAddress ?? '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-xs text-brand-blue hover:underline">
                      {expanded === r.id ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
                {expanded === r.id && (
                  <tr key={`${r.id}-x`} className="border-t border-gray-100 bg-brand-light/50">
                    <td colSpan={6} className="p-4">
                      <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-gray mb-1">Before</div>
                          <pre className="bg-white rounded-lg border border-gray-200 p-3 overflow-auto max-h-60">{JSON.stringify(r.oldValue, null, 2) || '—'}</pre>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-gray mb-1">After</div>
                          <pre className="bg-white rounded-lg border border-gray-200 p-3 overflow-auto max-h-60">{JSON.stringify(r.newValue, null, 2) || '—'}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        <button className="btn-outline btn-sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
        <span className="text-brand-gray">Page {page}</span>
        <button className="btn-outline btn-sm" onClick={() => setPage((p) => p + 1)} disabled={items.length < 50}>Next →</button>
      </div>
    </div>
  );
}
