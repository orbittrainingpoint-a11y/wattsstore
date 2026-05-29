'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useRouteParams } from '@/lib/useRouteParams';

interface OrderRow {
  orderNumber: string;
  status: string;
  currencyCode: string;
  totalAmount: number;
  createdAt: string;
  _count: { items: number };
}

const STATUS_TONE: Record<string, string> = {
  pending_payment: 'badge bg-gray-100 text-brand-gray',
  paid: 'badge-success',
  pending_verification: 'badge-warning',
  verified: 'badge-blue',
  processing: 'badge-blue',
  shipped: 'badge bg-[#4cc9f0]/20 text-[#0f5a8a]',
  delivered: 'badge-success',
  cancelled: 'badge-error',
  refunded: 'badge-error',
};

export default function OrdersPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.get<OrderRow[]>('/orders', { country: region })
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [region]);

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'My Orders' }]} />

      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Account</div>
          <h1 className="mt-1 text-3xl font-extrabold">My Orders</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[['all','All'],['pending_payment','Pending'],['paid','Paid'],['shipped','Shipped'],['delivered','Delivered'],['cancelled','Cancelled']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v as string)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === v ? 'bg-brand-blue text-white shadow-sm' : 'bg-white border border-gray-200 text-brand-gray hover:border-brand-blue hover:text-brand-blue'}`}>
              {l}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="card p-12 text-center text-sm text-brand-gray">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl">📦</div>
          <p className="mt-3 font-semibold">No orders yet</p>
          <p className="mt-1 text-sm text-brand-gray">Once you place an order it will appear here.</p>
          <Link href={`/${region}`} className="btn-primary mt-5 inline-flex">Shop Catalog</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((o) => (
            <Link key={o.orderNumber} href={`/${region}/account/orders/${o.orderNumber}`} className="card card-hover p-5 grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4">
              <div>
                <div className="font-mono font-bold text-brand-blue">{o.orderNumber}</div>
                <div className="text-xs text-brand-gray">Placed {formatDate(o.createdAt)}</div>
              </div>
              <div className="text-sm">
                <div className="text-brand-gray text-xs">Items</div>
                <div className="font-semibold">{o._count.items}</div>
              </div>
              <div className="text-sm hidden md:block">
                <div className="text-brand-gray text-xs">Total</div>
                <div className="font-mono font-bold">{formatCurrency(o.totalAmount, o.currencyCode)}</div>
              </div>
              <div className="hidden md:block"><span className={STATUS_TONE[o.status] ?? 'badge bg-gray-100'}>{o.status.replace(/_/g, ' ')}</span></div>
              <div className="text-right text-sm text-brand-blue font-semibold">View →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
