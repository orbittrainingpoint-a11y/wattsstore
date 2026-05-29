'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Kpis {
  revenueToday: number;
  revenueDeltaPct: number;
  ordersToday: number;
  ordersDelta: number;
  pendingFulfillment: number;
  pendingPayments: number;
  pendingVerification: number;
  activeRfqs: number;
  newCustomersToday: number;
  newCustomersDelta: number;
  lowStockCount: number;
}
interface SalesPoint { day: string; revenue: number; orders: number }
interface TopProduct { id: number; title: string; totalSold: number }
interface LowStockRow { title: string; variant_sku: string; stock_on_hand: number }
interface FunnelRow { stage: string; count: number; pct: number }
interface OpsHealth { pendingNotifications: number; failedNotifications: number; expiringQuotes: number; openShipments: number }

interface Dashboard {
  kpis: Kpis;
  series: SalesPoint[];
  topProducts: TopProduct[];
  lowStock: LowStockRow[];
  funnel: FunnelRow[];
  ops: OpsHealth;
}

function fmtDelta(n: number, unit: '%' | 'n' = '%') {
  if (n === 0) return '0';
  const sign = n > 0 ? '+' : '';
  return unit === '%' ? `${sign}${n.toFixed(1)}%` : `${sign}${n}`;
}

function deltaTone(n: number) {
  return n >= 0 ? 'text-emerald-700 bg-emerald-100' : 'text-rose-700 bg-rose-100';
}

export default function AdminDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    api.get<Dashboard>('/admin/reports/dashboard').then((r) => setData(r.data)).catch((e) => setError(e.message));
  }, []);

  const seriesPath = useMemo(() => {
    if (!data?.series?.length) return { area: '', line: '', max: 0 };
    const points = data.series.slice(-range);
    const max = Math.max(1, ...points.map((p) => p.revenue));
    const stepX = 400 / Math.max(1, points.length - 1);
    const coords = points.map((p, i) => [i * stepX, 160 - (p.revenue / max) * 140]);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const area = `${line} L400,160 L0,160 Z`;
    return { area, line, max };
  }, [data?.series, range]);

  if (error) return <div className="card p-6 text-status-error">⚠ {error}</div>;
  if (!data) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100" />)}
    </div>
  );

  const k = data.kpis;
  const cards = [
    { l: 'Revenue Today',       v: k.revenueToday.toLocaleString(undefined, { maximumFractionDigits: 0 }), pre: 'AED', delta: fmtDelta(k.revenueDeltaPct),    tone: 'from-emerald-50 to-white', ring: 'ring-emerald-200/60', tag: deltaTone(k.revenueDeltaPct), i: '💸', href: '/admin/orders' },
    { l: 'Orders Today',        v: k.ordersToday.toString(),                                              pre: '',    delta: fmtDelta(k.ordersDelta, 'n'),     tone: 'from-blue-50 to-white',     ring: 'ring-blue-200/60',    tag: deltaTone(k.ordersDelta),     i: '🧾', href: '/admin/orders' },
    { l: 'Pending Fulfillment', v: k.pendingFulfillment.toString(),                                       pre: '',    delta: 'live',                            tone: 'from-amber-50 to-white',    ring: 'ring-amber-200/60',   tag: 'bg-white text-brand-blue',    i: '🚚', href: '/admin/orders?status=verified' },
    { l: 'Active RFQs',         v: k.activeRfqs.toString(),                                               pre: '',    delta: 'queue',                           tone: 'from-violet-50 to-white',   ring: 'ring-violet-200/60',  tag: 'bg-white text-brand-blue',    i: '📋', href: '/admin/rfq' },
    { l: 'New Customers',       v: k.newCustomersToday.toString(),                                        pre: '',    delta: fmtDelta(k.newCustomersDelta, 'n'),tone: 'from-cyan-50 to-white',     ring: 'ring-cyan-200/60',    tag: deltaTone(k.newCustomersDelta), i: '👥', href: '/admin/customers' },
    { l: 'Low Stock Alerts',    v: k.lowStockCount.toString(),                                            pre: '',    delta: 'action',                          tone: 'from-rose-50 to-white',     ring: 'ring-rose-200/60',    tag: 'bg-white text-rose-700',      i: '⚠️', href: '/admin/inventory?lowStock=true' },
  ];

  return (
    <div>
      {/* Heading */}
      <header className="mb-6">
        <div className="section-eyebrow">Console</div>
        <h1 className="mt-1 text-3xl font-extrabold">Welcome back 👋</h1>
        <p className="text-sm text-brand-gray">Live storefront snapshot — {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </header>

      {/* Ops health strip */}
      {(data.ops.pendingNotifications + data.ops.failedNotifications + data.ops.expiringQuotes) > 0 && (
        <div className="mb-4 card p-3 flex flex-wrap items-center gap-3 text-sm bg-amber-50/60 border-amber-200/60">
          <span className="badge-warning">Ops alerts</span>
          {data.ops.pendingNotifications > 0 && <Link href="/admin/notifications?status=pending" className="link-underline">{data.ops.pendingNotifications} pending notifications</Link>}
          {data.ops.failedNotifications > 0 && <Link href="/admin/notifications?status=failed" className="link-underline text-status-error">{data.ops.failedNotifications} failed</Link>}
          {data.ops.expiringQuotes > 0 && <Link href="/admin/rfq" className="link-underline">{data.ops.expiringQuotes} quotes expiring</Link>}
          {data.ops.openShipments > 0 && <span className="text-brand-gray">· {data.ops.openShipments} shipments in transit</span>}
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link key={c.l} href={c.href} className={`group relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-br ${c.tone} p-5 ring-1 ${c.ring} hover:shadow-modal transition`}>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-white shadow-card flex items-center justify-center text-xl">{c.i}</div>
              <span className={`badge ${c.tag}`}>{c.delta}</span>
            </div>
            <div className="mt-3 text-2xl font-extrabold tracking-tight text-brand-dark">{c.pre ? <span className="text-sm text-brand-gray mr-1">{c.pre}</span> : null}{c.v}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-brand-gray font-semibold">{c.l}</div>
          </Link>
        ))}
      </section>

      {/* Revenue chart + Funnel */}
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Revenue · last {range} days</h2>
            <div className="flex gap-1 text-xs">
              {([7, 30, 90] as const).map((t) => (
                <button key={t} onClick={() => setRange(t)} className={`px-2.5 py-1 rounded-full ${range === t ? 'bg-brand-blue text-white' : 'text-brand-gray hover:bg-brand-blue/5'}`}>{t}D</button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-48 relative rounded-lg bg-gradient-to-b from-brand-blue/5 to-transparent overflow-hidden">
            <svg viewBox="0 0 400 160" preserveAspectRatio="none" className="h-full w-full">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#1e4d8c" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#1e4d8c" stopOpacity="0" />
                </linearGradient>
              </defs>
              {seriesPath.area ? (
                <>
                  <path d={seriesPath.area} fill="url(#g1)" />
                  <path d={seriesPath.line} fill="none" stroke="#1e4d8c" strokeWidth="2.5" />
                </>
              ) : (
                <text x="200" y="80" textAnchor="middle" className="fill-brand-gray text-xs">No revenue in this window yet.</text>
              )}
            </svg>
          </div>
          <div className="mt-3 text-xs text-brand-gray flex items-center justify-between">
            <span>Peak day: {seriesPath.max.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>{data.series.length} data points</span>
          </div>
        </div>

        {/* Conversion funnel — live */}
        <div className="card p-5">
          <h2 className="font-bold">Conversion funnel · 30d</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {data.funnel.map((s) => (
              <li key={s.stage}>
                <div className="flex justify-between text-xs">
                  <span className="text-brand-gray">{s.stage}</span>
                  <span className="font-mono font-semibold">{s.count.toLocaleString()} <span className="text-brand-gray">· {s.pct}%</span></span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${s.stage === 'Abandoned' ? 'bg-gradient-to-r from-rose-400 to-amber-300' : 'bg-gradient-to-r from-brand-blue to-[#4cc9f0]'}`} style={{ width: `${Math.min(100, s.pct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Top products + low stock */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Top Selling Products</h2>
            <Link href="/admin/catalog/products" className="text-xs text-brand-blue link-underline">All →</Link>
          </div>
          <ul className="mt-3 divide-y divide-gray-100">
            {data.topProducts.length === 0 ? (
              <li className="py-4 text-sm text-brand-gray">No data yet — seed the catalog to populate.</li>
            ) : data.topProducts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="h-7 w-7 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 line-clamp-1">{p.title}</span>
                <span className="font-mono text-brand-gray">{p.totalSold} sold</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Low Stock</h2>
            <Link href="/admin/inventory" className="text-xs text-brand-blue link-underline">Restock →</Link>
          </div>
          <ul className="mt-3 divide-y divide-gray-100">
            {data.lowStock.length === 0 ? (
              <li className="py-4 text-sm text-status-success">✓ All inventory healthy.</li>
            ) : data.lowStock.slice(0, 8).map((s) => (
              <li key={s.variant_sku} className="flex items-center gap-3 py-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-status-warning" />
                <span className="flex-1 line-clamp-1">{s.title}</span>
                <span className="font-mono text-xs text-brand-gray">{s.variant_sku}</span>
                <span className="font-mono font-bold text-status-warning">{s.stock_on_hand}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pending breakdown */}
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/orders?status=pending_payment" className="card p-4 hover:shadow-modal transition">
          <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Pending payments</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-700">{k.pendingPayments}</div>
        </Link>
        <Link href="/admin/orders?status=pending_verification" className="card p-4 hover:shadow-modal transition">
          <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Awaiting verification</div>
          <div className="mt-1 text-2xl font-extrabold text-blue-700">{k.pendingVerification}</div>
        </Link>
        <Link href="/admin/orders?status=processing" className="card p-4 hover:shadow-modal transition">
          <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Processing</div>
          <div className="mt-1 text-2xl font-extrabold text-brand-blue">{k.pendingFulfillment}</div>
        </Link>
      </section>
    </div>
  );
}
