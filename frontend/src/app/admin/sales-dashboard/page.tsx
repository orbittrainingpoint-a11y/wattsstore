'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RecentQuote {
  id: number;
  quoteRefNumber: string;
  companyName: string;
  quoteStatus: string;
  urgencyLevel: string;
  totalOfferedValue: number | null;
  currencyCode: string;
  updatedAt: string;
}

interface MonthlySeries { month: string; offered: number; accepted: number; revenue: number }

interface Dashboard {
  openQueue: number;
  myClaimed: number;
  myOfferedThisMonth: number;
  myAcceptedThisMonth: number;
  myInvoicedThisMonth: number;
  avgOfferedValue: number;
  acceptRate: number;
  recentClaims: RecentQuote[];
  series: MonthlySeries[];
}

const STATUS_TONE: Record<string, string> = {
  submitted: 'badge-warning',
  under_review: 'badge-blue',
  offered: 'badge bg-[#4cc9f0]/20 text-[#0f5a8a]',
  invoice_sent: 'badge-success',
  accepted: 'badge-success',
  rejected: 'badge-error',
  expired: 'badge bg-gray-100 text-brand-gray',
};

export default function SalesAgentDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Dashboard>('/sales/dashboard').then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);

  const chartPath = useMemo(() => {
    if (!data?.series?.length) return { area: '', line: '' };
    const max = Math.max(1, ...data.series.map((p) => p.revenue));
    const stepX = data.series.length === 1 ? 200 : 400 / (data.series.length - 1);
    const coords = data.series.map((p, i) => [i * stepX, 160 - (p.revenue / max) * 140]);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    return { area: `${line} L400,160 L0,160 Z`, line };
  }, [data?.series]);

  if (error) return <div className="card p-6 text-status-error">⚠ {error}</div>;
  if (!data) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100" />)}
    </div>
  );

  const tiles = [
    { l: 'Open queue (claimable)', v: data.openQueue,             href: '/admin/rfq?status=submitted', tone: 'from-amber-50 to-white',   ring: 'ring-amber-200/60',   i: '🆕' },
    { l: 'My claimed RFQs',        v: data.myClaimed,             href: '/admin/rfq',                  tone: 'from-blue-50 to-white',     ring: 'ring-blue-200/60',    i: '📋' },
    { l: 'Offered this month',     v: data.myOfferedThisMonth,    href: '/admin/rfq?status=offered',   tone: 'from-cyan-50 to-white',     ring: 'ring-cyan-200/60',    i: '💬' },
    { l: 'Invoiced this month',    v: data.myInvoicedThisMonth,   href: '/admin/rfq?status=invoice_sent', tone: 'from-violet-50 to-white', ring: 'ring-violet-200/60', i: '📄' },
    { l: 'Accepted this month',    v: data.myAcceptedThisMonth,   href: '/admin/rfq?status=accepted',  tone: 'from-emerald-50 to-white',  ring: 'ring-emerald-200/60', i: '✅' },
    { l: 'Accept rate',            v: `${data.acceptRate}%`,      href: '/admin/rfq',                  tone: 'from-rose-50 to-white',     ring: 'ring-rose-200/60',    i: '🎯' },
  ];

  return (
    <div>
      <header className="mb-6">
        <div className="section-eyebrow">Sales</div>
        <h1 className="mt-1 text-3xl font-extrabold">My sales console</h1>
        <p className="text-sm text-brand-gray">Personal performance — claims, conversions, invoiced revenue this month.</p>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((c) => (
          <Link key={c.l} href={c.href} className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${c.tone} p-5 ring-1 ${c.ring} hover:shadow-modal transition`}>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-white shadow-card flex items-center justify-center text-xl">{c.i}</div>
            </div>
            <div className="mt-3 text-2xl font-extrabold tracking-tight text-brand-dark">{c.v}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-brand-gray font-semibold">{c.l}</div>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {/* Revenue from accepted quotes */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Revenue from accepted quotes · 6 months</h2>
            <div className="text-xs text-brand-gray">avg offered: <span className="font-mono font-semibold text-brand-dark">{data.avgOfferedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
          </div>
          <div className="mt-4 h-48 relative rounded-lg bg-gradient-to-b from-brand-blue/5 to-transparent overflow-hidden">
            <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1e4d8c" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#1e4d8c" stopOpacity="0" />
                </linearGradient>
              </defs>
              {chartPath.area ? (
                <>
                  <path d={chartPath.area} fill="url(#sg)" />
                  <path d={chartPath.line} fill="none" stroke="#1e4d8c" strokeWidth="2.5" />
                </>
              ) : (
                <text x="200" y="80" textAnchor="middle" className="fill-brand-gray text-xs">No accepted quotes yet — claim a quote and convert one.</text>
              )}
            </svg>
          </div>
        </div>

        {/* My accept-vs-offered split */}
        <div className="card p-5">
          <h2 className="font-bold">Pipeline this month</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {[
              { l: 'Offered',    n: data.myOfferedThisMonth,   tone: 'from-brand-blue to-[#4cc9f0]' },
              { l: 'Invoiced',   n: data.myInvoicedThisMonth,  tone: 'from-violet-500 to-fuchsia-400' },
              { l: 'Accepted',   n: data.myAcceptedThisMonth,  tone: 'from-emerald-500 to-emerald-300' },
            ].map((s) => {
              const max = Math.max(1, data.myOfferedThisMonth, data.myInvoicedThisMonth, data.myAcceptedThisMonth);
              const pct = Math.round((s.n / max) * 100);
              return (
                <li key={s.l}>
                  <div className="flex justify-between text-xs"><span className="text-brand-gray">{s.l}</span><span className="font-mono font-semibold">{s.n}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${s.tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mt-6 card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold">Recent activity on my RFQs</h2>
          <Link href="/admin/rfq" className="text-xs text-brand-blue link-underline">All RFQs →</Link>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray bg-brand-light">
            <tr>
              <th className="p-3 font-bold">Reference</th>
              <th className="p-3 font-bold">Company</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Urgency</th>
              <th className="p-3 font-bold text-right">Value</th>
              <th className="p-3 font-bold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {data.recentClaims.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-brand-gray">
                <p className="font-semibold text-brand-dark">No claimed RFQs yet</p>
                <p className="text-xs mt-1">Open the queue and claim a submission to start tracking activity here.</p>
                <Link href="/admin/rfq?status=submitted" className="btn-primary btn-sm inline-flex mt-4">Open queue →</Link>
              </td></tr>
            ) : data.recentClaims.map((q) => (
              <tr key={q.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                <td className="p-3 font-mono font-bold text-brand-blue"><Link href={`/admin/rfq/${q.id}`} className="hover:underline">{q.quoteRefNumber}</Link></td>
                <td className="p-3 font-medium">{q.companyName}</td>
                <td className="p-3"><span className={STATUS_TONE[q.quoteStatus] ?? 'badge'}>{q.quoteStatus.replace(/_/g, ' ')}</span></td>
                <td className="p-3 text-xs">{q.urgencyLevel.replace(/_/g, ' ')}</td>
                <td className="p-3 text-right font-mono">{q.totalOfferedValue != null ? formatCurrency(q.totalOfferedValue, q.currencyCode) : '—'}</td>
                <td className="p-3 text-xs">{formatDate(q.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
