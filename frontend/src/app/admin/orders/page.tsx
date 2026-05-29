'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface AdminOrder { id: number; orderNumber: string; status: string; paymentStatus: string; isShippingVerified: boolean; totalAmount: number; currencyCode: string; createdAt: string; _count: { items: number } }

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

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState('');

  function load() {
    api.get<AdminOrder[]>(`/admin/orders${status ? `?status=${status}` : ''}`).then((r) => setOrders(r.data)).catch(() => setOrders([]));
  }
  useEffect(load, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Sales</div>
          <h1 className="mt-1 text-3xl font-extrabold">Orders</h1>
          <p className="text-sm text-brand-gray">{orders.length} {orders.length === 1 ? 'order' : 'orders'} {status && `· filtered by ${status.replace(/_/g, ' ')}`}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[['','All'],['pending_payment','Pending'],['paid','Paid'],['verified','Verified'],['shipped','Shipped'],['delivered','Delivered'],['cancelled','Cancelled']].map(([v,l]) => (
            <button key={v || 'all'} onClick={() => setStatus(v as string)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${status === v ? 'bg-brand-blue text-white shadow-sm' : 'bg-white border border-gray-200 text-brand-gray hover:border-brand-blue hover:text-brand-blue'}`}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left" style={{ background: 'linear-gradient(180deg,#eef3fa 0%,#f7f9fc 100%)' }}>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-brand-gray">
              <th className="p-4 font-bold">Order</th>
              <th className="p-4 font-bold">Date</th>
              <th className="p-4 font-bold">Items</th>
              <th className="p-4 font-bold">Total</th>
              <th className="p-4 font-bold">Payment</th>
              <th className="p-4 font-bold">Status</th>
              <th className="p-4 font-bold">Verified</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td className="p-10 text-center text-brand-gray" colSpan={8}>
                <div className="text-5xl">📦</div>
                <p className="mt-3 font-semibold text-brand-dark">No orders to show</p>
                <p className="text-xs">Orders placed by customers will appear here.</p>
              </td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-4 font-mono font-bold text-brand-blue">{o.orderNumber}</td>
                  <td className="p-4 text-xs">{formatDate(o.createdAt)}</td>
                  <td className="p-4">{o._count.items}</td>
                  <td className="p-4 font-mono font-bold">{formatCurrency(o.totalAmount, o.currencyCode)}</td>
                  <td className="p-4 text-xs uppercase tracking-wider">{o.paymentStatus}</td>
                  <td className="p-4"><span className={STATUS_TONE[o.status] ?? 'badge bg-gray-100'}>{o.status.replace(/_/g, ' ')}</span></td>
                  <td className="p-4">{o.isShippingVerified ? <span className="text-status-success">✓</span> : <span className="text-status-warning">⚠</span>}</td>
                  <td className="p-4 text-right"><Link href={`/admin/orders/${o.id}`} className="text-brand-blue text-xs font-semibold hover:underline">Open -&gt;</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
