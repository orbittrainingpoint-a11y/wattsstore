'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Quote { id: number; quoteRefNumber: string; companyName: string; quoteStatus: string; urgencyLevel: string; createdAt: string; _count: { items: number } }

const URGENCY_TONE: Record<string, string> = {
  immediate: 'badge-error',
  within_30_days: 'badge-warning',
  within_60_days: 'badge-blue',
  planning_phase: 'badge bg-gray-100 text-brand-gray',
};

const STATUS_TONE: Record<string, string> = {
  submitted: 'badge-warning',
  under_review: 'badge-blue',
  offered: 'badge bg-[#4cc9f0]/20 text-[#0f5a8a]',
  quotation_generating: 'badge-blue',
  invoice_sent: 'badge-success',
  delivery_failed: 'badge-error',
  accepted: 'badge-success',
  rejected: 'badge-error',
  expired: 'badge bg-gray-100 text-brand-gray',
};

export default function RfqQueue() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    api.get<Quote[]>('/sales/quotes').then((r) => setQuotes(r.data)).catch(() => setQuotes([]));
  }
  useEffect(load, []);

  async function claim(id: number) {
    try {
      await api.post(`/sales/quotes/${id}/claim`);
      setMsg('Quote claimed');
      load();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  const open = quotes.filter((q) => ['submitted', 'under_review'].includes(q.quoteStatus)).length;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Sales</div>
          <h1 className="mt-1 text-3xl font-extrabold">RFQ Queue</h1>
          <p className="text-sm text-brand-gray">{open} open · {quotes.length} total</p>
        </div>
        {msg && <div className="text-sm rounded-lg bg-brand-blue/10 text-brand-blue px-3 py-1.5">{msg}</div>}
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left" style={{ background: 'linear-gradient(180deg,#eef3fa 0%,#f7f9fc 100%)' }}>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-brand-gray">
              <th className="p-4 font-bold">Reference</th>
              <th className="p-4 font-bold">Company</th>
              <th className="p-4 font-bold">Urgency</th>
              <th className="p-4 font-bold">Items</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr>
                <td className="p-10 text-center text-brand-gray" colSpan={7}>
                  <div className="text-5xl">📋</div>
                  <p className="mt-3 font-semibold text-brand-dark">No quote requests yet</p>
                  <p className="text-xs">Submissions from the storefront RFQ form will appear here.</p>
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr key={q.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-4 font-mono font-bold text-brand-blue">{q.quoteRefNumber}</td>
                  <td className="p-4 font-medium">{q.companyName}</td>
                  <td className="p-4"><span className={URGENCY_TONE[q.urgencyLevel] ?? 'badge'}>{q.urgencyLevel.replace(/_/g, ' ')}</span></td>
                  <td className="p-4"><span className="badge-blue">{q._count.items}</span></td>
                  <td className="p-4"><span className={STATUS_TONE[q.quoteStatus] ?? 'badge bg-gray-100'}>{q.quoteStatus.replace(/_/g, ' ')}</span></td>
                  <td className="p-4 text-xs">{formatDate(q.createdAt)}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/rfq/${q.id}`} className="btn-outline btn-sm">Open</Link>
                      {q.quoteStatus === 'submitted' && <button onClick={() => claim(q.id)} className="btn-yellow btn-sm">Claim</button>}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
