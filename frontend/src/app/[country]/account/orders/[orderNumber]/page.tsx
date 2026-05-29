'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { productImage } from '@/lib/images';
import { useRouteParams } from '@/lib/useRouteParams';

interface OrderItem { id: number; productTitle: string; variantSku: string; quantity: number; unitPrice: number; subtotal: number; imageUrl: string | null; productVariantId: number }
interface OrderDetail {
  id: number; orderNumber: string; status: string; paymentStatus: string; currencyCode: string;
  subtotal: number; shippingAmount: number; taxAmount: number; totalAmount: number;
  shippingFirstName: string; shippingLastName: string; shippingAddress1: string; shippingCity: string; shippingCountryCode: string;
  isShippingVerified: boolean; createdAt: string;
  items: OrderItem[];
  statusHistory: { status: string; note: string | null; createdAt: string }[];
  shipments: { trackingNumber: string | null; carrier: string | null; shippedAt: string | null; estimatedDelivery: string | null; status: string }[];
  invoiceUrl?: string | null;
}

function carrierTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const c = carrier.trim().toLowerCase();
  const enc = encodeURIComponent(trackingNumber);
  if (c.includes('aramex')) return `https://www.aramex.com/track/results?ShipmentNumber=${enc}`;
  if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${enc}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${enc}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${enc}`;
  if (c.includes('dpd')) return `https://www.dpd.com/tracking/${enc}`;
  return null;
}

const LIFECYCLE = ['pending_payment','paid','pending_verification','verified','processing','shipped','delivered'];

export default function OrderDetailPage({ params }: { params: Promise<{ country: string; orderNumber: string }> }) {
  const { country: region, orderNumber } = useRouteParams(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => {
    if (user) api.get<OrderDetail>(`/orders/${orderNumber}`, { country: region })
      .then((r) => setOrder(r.data))
      .catch((e) => setErr((e as Error).message));
  }, [user, region, orderNumber]);

  if (!order && !err) return <div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>;
  if (err) return <div className="container-ws py-16 text-center text-status-error">{err}</div>;
  if (!order) return null;

  const currentStep = LIFECYCLE.indexOf(order.status);

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'Orders', href: `/${region}/account/orders` }, { label: order.orderNumber }]} />

      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Order</div>
          <h1 className="mt-1 text-3xl font-extrabold font-mono">{order.orderNumber}</h1>
          <p className="text-sm text-brand-gray">Placed {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge bg-brand-blue/10 text-brand-blue">{order.status.replace(/_/g, ' ')}</span>
          {order.isShippingVerified ? <span className="badge-success">✓ Verified</span> : <span className="badge-warning">Verify address</span>}
          {order.invoiceUrl && <a href={`/api/v1/orders/${order.orderNumber}/invoice`} target="_blank" rel="noreferrer" className="badge bg-brand-yellow/20 text-amber-700">Invoice PDF</a>}
        </div>
      </header>

      <section className="card p-6 mb-4">
        <h2 className="font-extrabold mb-4">Progress</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {LIFECYCLE.map((s, i) => {
            const done = i <= currentStep;
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${done ? 'bg-status-success text-white' : 'bg-gray-200 text-brand-gray'}`}>{done ? '✓' : i + 1}</div>
                <div className="text-xs font-semibold">{s.replace(/_/g, ' ')}</div>
                {i < LIFECYCLE.length - 1 && <div className={`h-px w-6 ${done ? 'bg-status-success' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div>
          <section className="card p-6 mb-4">
            <h2 className="font-extrabold mb-4">Items ({order.items.length})</h2>
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 pb-3 border-b border-gray-100 last:border-0">
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-brand-light shrink-0">
                    <img src={it.imageUrl ?? productImage({ productId: it.productVariantId })} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold line-clamp-1">{it.productTitle}</div>
                    <div className="text-xs text-brand-gray font-mono">{it.variantSku} · ×{it.quantity}</div>
                  </div>
                  <div className="font-mono font-bold">{formatCurrency(it.subtotal, order.currencyCode)}</div>
                </div>
              ))}
            </div>
          </section>

          {order.shipments.length > 0 && (
            <section className="card p-6 mb-4">
              <h2 className="font-extrabold mb-3">Shipment</h2>
              <div className="space-y-3">
                {order.shipments.map((s, i) => {
                  const url = carrierTrackingUrl(s.carrier, s.trackingNumber);
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="text-2xl">🚚</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{s.carrier ?? 'Carrier'}</div>
                        <div className="text-xs text-brand-gray font-mono">{s.trackingNumber}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="badge bg-brand-blue/10 text-brand-blue">{s.status.replace(/_/g, ' ')}</span>
                          {s.shippedAt && <span className="text-brand-gray">Shipped {formatDate(s.shippedAt)}</span>}
                          {s.estimatedDelivery && <span className="text-brand-gray">ETA {formatDate(s.estimatedDelivery)}</span>}
                        </div>
                      </div>
                      {url && <a href={url} target="_blank" rel="noreferrer" className="btn-outline btn-sm">Track on carrier ↗</a>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="card p-6">
            <h2 className="font-extrabold mb-3">Status history</h2>
            <ol className="space-y-3 text-sm">
              {order.statusHistory.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand-blue mt-2" />
                  <div>
                    <div className="font-semibold">{h.status.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-brand-gray">{formatDate(h.createdAt)}{h.note ? ` · ${h.note}` : ''}</div>
                  </div>
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
          </div>
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Ship to</h3>
            <div className="text-sm">{order.shippingFirstName} {order.shippingLastName}</div>
            <div className="text-xs text-brand-gray">{order.shippingAddress1}, {order.shippingCity}, {order.shippingCountryCode}</div>
          </div>
          <Link href={`/${region}/contact`} className="btn-outline w-full">Get help with this order</Link>
        </aside>
      </div>
    </div>
  );
}
