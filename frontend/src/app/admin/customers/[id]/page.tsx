'use client';

import { useEffect, useState } from 'react';
import { Children } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouteParams } from '@/lib/useRouteParams';

interface CustomerDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  totalSpent: number;
  orders: { orderNumber: string; totalAmount: number; status: string; createdAt: string }[];
  quotes: { quoteRefNumber: string; quoteStatus: string; createdAt: string }[];
}

export default function AdminCustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = useRouteParams(params).id;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    api.get<CustomerDetail>(`/admin/customers/${id}`)
      .then((response) => setCustomer(response.data))
      .catch((err) => setError((err as Error).message));
  }

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleAccess() {
    if (!customer) return;
    const reason = prompt(customer.isActive ? 'Reason for banning this customer' : 'Reason for restoring this customer');
    if (!reason?.trim()) return;
    try {
      await api.put(`/admin/customers/${customer.id}/ban`, { reason: reason.trim() });
      setMessage(customer.isActive ? 'Customer access disabled.' : 'Customer access restored.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!customer && !error) return <div className="text-sm text-brand-gray">Loading...</div>;
  if (!customer) return <div className="text-status-error">{error}</div>;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Customers</div>
          <h1 className="mt-1 text-3xl font-extrabold">{customer.firstName} {customer.lastName}</h1>
          <p className="text-sm text-brand-gray">{customer.email} | Joined {formatDate(customer.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/customers" className="btn-outline">&lt;- Customers</Link>
          <button onClick={() => void toggleAccess()} className={customer.isActive ? 'btn-ghost text-status-error' : 'btn-primary'}>
            {customer.isActive ? 'Ban access' : 'Restore access'}
          </button>
        </div>
      </header>

      {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Account status" value={customer.isActive ? 'Active' : 'Banned'} />
        <Metric label="Orders" value={String(customer.orders.length)} />
        <Metric label="Paid spend" value={formatCurrency(customer.totalSpent, 'AED')} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <History title="Recent orders" empty="No orders yet.">
          {customer.orders.map((order) => (
            <div key={order.orderNumber} className="flex justify-between border-b border-gray-100 py-3 text-sm last:border-0">
              <div><div className="font-mono font-bold text-brand-blue">{order.orderNumber}</div><div className="text-xs text-brand-gray">{formatDate(order.createdAt)}</div></div>
              <div className="text-right"><div className="font-semibold">{formatCurrency(order.totalAmount, 'AED')}</div><div className="text-xs capitalize text-brand-gray">{order.status.replace(/_/g, ' ')}</div></div>
            </div>
          ))}
        </History>
        <History title="Recent quotes" empty="No quote requests yet.">
          {customer.quotes.map((quote) => (
            <div key={quote.quoteRefNumber} className="flex justify-between border-b border-gray-100 py-3 text-sm last:border-0">
              <div className="font-mono font-bold text-brand-blue">{quote.quoteRefNumber}</div>
              <div className="text-right"><div className="capitalize">{quote.quoteStatus.replace(/_/g, ' ')}</div><div className="text-xs text-brand-gray">{formatDate(quote.createdAt)}</div></div>
            </div>
          ))}
        </History>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="card p-4"><div className="text-xs font-bold uppercase tracking-wider text-brand-gray">{label}</div><div className="mt-2 text-xl font-extrabold">{value}</div></div>;
}

function History({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  return <section className="card p-5"><h2 className="mb-2 text-lg font-extrabold">{title}</h2>{Children.count(children) ? children : <p className="text-sm text-brand-gray">{empty}</p>}</section>;
}
