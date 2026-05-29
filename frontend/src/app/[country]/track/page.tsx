'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PageHero } from '@/components/ui/PageHero';
import { useRouteParams } from '@/lib/useRouteParams';

interface TrackingResp {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  currencyCode: string;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
  isShippingVerified: boolean;
  shippingCity: string | null;
  shippingCountryCode: string | null;
  items: { productTitle: string; variantSku: string; quantity: number }[];
  shipments: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    estimatedDelivery: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    status: string;
  }[];
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}

const LIFECYCLE = ['pending_payment', 'paid', 'pending_verification', 'verified', 'processing', 'shipped', 'delivered'];

const STATUS_TONE: Record<string, string> = {
  pending_payment: 'badge-warning',
  paid: 'badge-success',
  pending_verification: 'badge-warning',
  verified: 'badge-blue',
  processing: 'badge-blue',
  shipped: 'badge bg-[#4cc9f0]/20 text-[#0f5a8a]',
  delivered: 'badge-success',
  cancelled: 'badge-error',
  refunded: 'badge bg-gray-100 text-brand-gray',
};

function TrackInner({ region }: { region: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const initialRef = params.get('ref') ?? '';
  const initialEmail = params.get('email') ?? '';

  const [ref, setRef] = useState(initialRef);
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<TrackingResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(r = ref, e = email) {
    if (!r.trim() || !e.trim()) {
      setError('Enter both order number and email.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await api.get<TrackingResp>(`/orders/track?ref=${encodeURIComponent(r.trim())}&email=${encodeURIComponent(e.trim())}`);
      setResult(data);
      // reflect to URL for shareable bookmarks
      const u = new URLSearchParams();
      u.set('ref', r.trim());
      u.set('email', e.trim());
      router.replace(`/${region}/track?${u.toString()}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Auto-lookup on first paint if both query params present
  useEffect(() => {
    if (initialRef && initialEmail && !result) lookup(initialRef, initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = result ? LIFECYCLE.indexOf(result.status) : -1;

  return (
    <div>
      <PageHero
        crumbs={[{ label: 'Home', href: `/${region}` }, { label: 'Track order' }]}
        eyebrow="Order status"
        title="Track your order."
        sub="Enter your order reference and the email you placed it with. No login needed."
      />

      <section className="container-ws py-10 md:py-14">
        <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
          <form
            onSubmit={(e) => { e.preventDefault(); lookup(); }}
            className="card p-6 space-y-3 lg:sticky lg:top-[150px]"
          >
            <h2 className="font-extrabold">Lookup</h2>
            <p className="text-xs text-brand-gray">Order ref like <span className="font-mono">WS-AE-2026-000128</span>.</p>
            <input className="input" placeholder="Order reference" value={ref} onChange={(e) => setRef(e.target.value)} />
            <input className="input" type="email" placeholder="Email used at checkout" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="text-sm text-status-error rounded-lg bg-status-error/10 p-2">⚠ {error}</p>}
            <button className="btn-primary btn-lg w-full" disabled={busy}>{busy ? 'Looking up…' : 'Track →'}</button>
            <p className="text-[11px] text-brand-gray text-center">
              Have an account? <Link href={`/auth/login?next=/${region}/account/orders`} className="link-underline text-brand-blue">Sign in</Link> for the full history.
            </p>
          </form>

          {result ? (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <div className="section-eyebrow">Order</div>
                    <h2 className="mt-1 text-2xl font-extrabold font-mono">{result.orderNumber}</h2>
                    <p className="text-sm text-brand-gray">Placed {formatDate(result.createdAt)}{result.paidAt ? ` · Paid ${formatDate(result.paidAt)}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={STATUS_TONE[result.status] ?? 'badge'}>{result.status.replace(/_/g, ' ')}</span>
                    {result.isShippingVerified ? <span className="badge-success">✓ Address verified</span> : <span className="badge-warning">Verify shipping email</span>}
                  </div>
                </div>

                {/* progress bar */}
                <div className="mt-5">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {LIFECYCLE.map((s, i) => {
                      const done = currentStep >= 0 && i <= currentStep;
                      const active = i === currentStep;
                      return (
                        <div key={s} className="flex items-center gap-2 shrink-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${done ? 'bg-status-success text-white' : active ? 'bg-brand-blue text-white' : 'bg-gray-200 text-brand-gray'}`}>
                            {done ? '✓' : i + 1}
                          </div>
                          <div className={`text-xs font-semibold ${active ? 'text-brand-blue' : 'text-brand-gray'}`}>{s.replace(/_/g, ' ')}</div>
                          {i < LIFECYCLE.length - 1 && <div className={`h-px w-6 ${done ? 'bg-status-success' : 'bg-gray-200'}`} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {result.shipments.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-extrabold">Shipment</h3>
                  <ul className="mt-3 space-y-3">
                    {result.shipments.map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="text-2xl">🚚</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold">{s.carrier ?? 'Carrier'} · <span className="font-mono text-sm">{s.trackingNumber}</span></div>
                          <div className="text-xs text-brand-gray">
                            {s.shippedAt ? <>Shipped {formatDate(s.shippedAt)}</> : 'Awaiting pickup'}
                            {s.estimatedDelivery && <> · ETA {formatDate(s.estimatedDelivery)}</>}
                            {s.deliveredAt && <> · Delivered {formatDate(s.deliveredAt)}</>}
                          </div>
                          <div className="mt-1"><span className="badge bg-brand-blue/10 text-brand-blue">{s.status.replace(/_/g, ' ')}</span></div>
                        </div>
                        {s.trackingUrl && (
                          <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="btn-outline btn-sm">Track on carrier ↗</a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card p-6">
                <h3 className="font-extrabold mb-3">Items</h3>
                <ul className="divide-y divide-gray-100 text-sm">
                  {result.items.map((it, i) => (
                    <li key={i} className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium line-clamp-1">{it.productTitle}</div>
                        <div className="text-xs font-mono text-brand-gray">{it.variantSku}</div>
                      </div>
                      <div className="font-mono">×{it.quantity}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-3 border-t border-gray-100 text-sm flex justify-between font-extrabold">
                  <span>Total</span>
                  <span className="font-mono text-brand-blue">{formatCurrency(result.totalAmount, result.currencyCode)}</span>
                </div>
                {result.shippingCity && (
                  <p className="mt-3 text-xs text-brand-gray">Ships to: {result.shippingCity}, {result.shippingCountryCode}</p>
                )}
              </div>

              <div className="card p-6">
                <h3 className="font-extrabold mb-3">Timeline</h3>
                <ol className="space-y-3 text-sm">
                  {result.statusHistory.map((h, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="h-2 w-2 rounded-full bg-brand-blue mt-2 shrink-0" />
                      <div>
                        <div className="font-semibold">{h.status.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-brand-gray">{formatDate(h.createdAt)}{h.note ? ` · ${h.note}` : ''}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card p-5 text-sm">
                Need help? <Link href={`/${region}/contact`} className="link-underline text-brand-blue">Contact support</Link> with your order reference.
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="text-5xl">🔍</div>
              <p className="mt-3 font-semibold">Enter your order details to begin tracking.</p>
              <p className="mt-1 text-sm text-brand-gray">We'll show you status, shipment progress, and delivery estimates.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function TrackPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  return (
    <Suspense fallback={<div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>}>
      <TrackInner region={region} />
    </Suspense>
  );
}
