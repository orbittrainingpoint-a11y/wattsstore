'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouteParams } from '@/lib/useRouteParams';

interface OrderItem { id: number; productTitle: string; variantSku: string; quantity: number; unitPrice: number; subtotal: number }
interface OrderDetail {
  id: number; orderNumber: string; status: string; paymentStatus: string; currencyCode: string;
  subtotal: number; shippingAmount: number; taxAmount: number; totalAmount: number;
  shippingFirstName: string; shippingLastName: string; shippingAddress1: string; shippingCity: string; shippingCountryCode: string;
  shippingPhone?: string; guestEmail?: string;
  isShippingVerified: boolean; createdAt: string;
  customerNotes?: string; adminNotes?: string;
  paymentGateway?: string; paymentGatewayRef?: string;
  items: OrderItem[];
  statusHistory: { status: string; note: string | null; createdAt: string }[];
  shipments: { id: number; trackingNumber: string | null; carrier: string | null; shippedAt: string | null; labelUrl?: string | null }[];
  invoiceUrl?: string | null;
}

const STATUS_OPTIONS = ['pending_payment','paid','pending_verification','verified','processing','shipped','delivered','cancelled','refunded'];

export default function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(useRouteParams(params).id);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [carrier, setCarrier] = useState('DHL');
  const [tracking, setTracking] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  function load() {
    api.get<OrderDetail>(`/admin/orders/${id}`).then((r) => { setOrder(r.data); setAdminNotes(r.data.adminNotes ?? ''); setNewStatus(r.data.status); }).catch((e) => setErr((e as Error).message));
  }
  useEffect(load, [id]);

  async function updateStatus() {
    try { await api.put(`/admin/orders/${id}/status`, { status: newStatus, note: statusNote }); setMsg('Status updated'); load(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function addShipment() {
    try { await api.post(`/admin/orders/${id}/shipment`, { carrier, trackingNumber: tracking }); setTracking(''); setMsg('Shipment added'); load(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function processRefund() {
    try { await api.post(`/admin/orders/${id}/refund`, { amount: Number(refundAmount), reason: refundReason }); setMsg('Refund processed'); load(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function saveNotes() {
    try { await api.put(`/admin/orders/${id}/admin-notes`, { adminNotes }); setMsg('Notes saved'); }
    catch (e) { setErr((e as Error).message); }
  }

  if (!order && !err) return <div className="text-sm text-brand-gray">Loading…</div>;
  if (err || !order) return <div className="text-status-error">{err}</div>;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Order</div>
          <h1 className="mt-1 text-3xl font-extrabold font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-brand-gray">{order.guestEmail ?? '—'} · placed {formatDate(order.createdAt)}</p>
        </div>
        <Link href="/admin/orders" className="btn-outline">← All orders</Link>
      </header>

      {msg && <div className="card p-3 mb-4 text-sm rounded-lg bg-status-success/10 text-status-success">✓ {msg}</div>}
      {!order.isShippingVerified && (
        <div className="card p-4 mb-4 text-sm flex items-center gap-3 border-status-warning/40 bg-status-warning/5">
          <span className="text-xl">⚠</span><span className="text-status-warning font-semibold">Shipping address not verified — fulfillment is locked until the customer confirms.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 bg-brand-blue/5"><h2 className="font-extrabold">Items</h2></header>
            <table className="w-full text-sm">
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="p-3"><div className="font-medium line-clamp-1">{it.productTitle}</div><div className="font-mono text-xs text-brand-gray">{it.variantSku}</div></td>
                    <td className="p-3 text-center font-mono">×{it.quantity}</td>
                    <td className="p-3 text-right font-mono">{formatCurrency(it.unitPrice, order.currencyCode)}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatCurrency(it.subtotal, order.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Update status</h2>
            <div className="flex flex-wrap gap-2">
              <select className="input flex-1" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <input className="input flex-1" placeholder="Note (optional)" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
              <button className="btn-primary" onClick={updateStatus}>Update</button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Add shipment</h2>
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1" placeholder="Carrier (DHL, Aramex)" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              <input className="input flex-1" placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <button className="btn-yellow" onClick={addShipment} disabled={!order.isShippingVerified || !tracking}>Add</button>
            </div>
            {order.shipments.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {order.shipments.map((s) => (
                  <li key={s.id} className="flex gap-3"><span>🚚</span><span className="font-mono">{s.carrier} · {s.trackingNumber}</span><span className="text-xs text-brand-gray ml-auto">{s.shippedAt ? formatDate(s.shippedAt) : ''}</span></li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Process refund</h2>
            <div className="flex flex-wrap gap-2">
              <input className="input w-32" type="number" placeholder="Amount" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
              <input className="input flex-1" placeholder="Reason" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
              <button className="btn-outline" onClick={processRefund} disabled={!refundAmount || !refundReason}>Refund</button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Internal notes</h2>
            <textarea className="input min-h-[80px]" placeholder="Notes visible only to the team" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            <button className="btn-outline btn-sm mt-2" onClick={saveNotes}>Save notes</button>
          </section>

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Status history</h2>
            <ol className="space-y-2 text-sm">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand-blue mt-2" />
                  <div><div className="font-semibold">{h.status.replace(/_/g, ' ')}</div><div className="text-xs text-brand-gray">{formatDate(h.createdAt)}{h.note ? ` · ${h.note}` : ''}</div></div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Total</h3>
            <div className="space-y-1.5 text-sm text-brand-gray">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(order.subtotal, order.currencyCode)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(order.shippingAmount, order.currencyCode)}</span></div>
              <div className="flex justify-between"><span>VAT</span><span>{formatCurrency(order.taxAmount, order.currencyCode)}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-lg font-extrabold">
              <span>Total</span><span className="font-mono text-brand-blue">{formatCurrency(order.totalAmount, order.currencyCode)}</span>
            </div>
            <div className="mt-3 text-xs"><span className="badge-blue">Payment: {order.paymentStatus}</span></div>
            <a className={`btn-outline btn-sm mt-4 w-full ${!order.invoiceUrl ? 'pointer-events-none opacity-50' : ''}`} href={`/api/v1/admin/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
              {order.invoiceUrl ? 'Download invoice PDF' : 'Invoice generating...'}
            </a>
          </div>
          <div className="card p-5">
            <h3 className="font-extrabold mb-2">Ship to</h3>
            <div className="text-sm">{order.shippingFirstName} {order.shippingLastName}</div>
            <div className="text-xs text-brand-gray">{order.shippingAddress1}, {order.shippingCity}, {order.shippingCountryCode}</div>
            {order.shippingPhone && <div className="text-xs text-brand-gray mt-1">{order.shippingPhone}</div>}
          </div>
          {order.paymentGatewayRef && (
            <div className="card p-5">
              <h3 className="font-extrabold mb-1">Gateway</h3>
              <div className="text-xs text-brand-gray">{order.paymentGateway}</div>
              <div className="font-mono text-xs break-all">{order.paymentGatewayRef}</div>
            </div>
          )}
          {order.shipments.length > 0 && (
            <div className="card p-5">
              <h3 className="font-extrabold mb-2">Courier receipts</h3>
              <div className="space-y-2">
                {order.shipments.map((shipment) => (
                  <a
                    key={shipment.id}
                    className={`btn-outline btn-sm w-full ${!shipment.labelUrl ? 'pointer-events-none opacity-50' : ''}`}
                    href={`/api/v1/admin/orders/${order.id}/shipments/${shipment.id}/receipt`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shipment.labelUrl ? `${shipment.carrier ?? 'Courier'} receipt` : 'Receipt generating...'}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
