'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUiStore } from '@/stores/uiStore';
import { useCart } from '@/lib/useCart';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, REGIONS } from '@/lib/utils';
import { productImage } from '@/lib/images';
import { useRouteParams } from '@/lib/useRouteParams';

const STEPS = ['Contact', 'Delivery', 'Payment'] as const;

export default function CheckoutPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { refresh } = useCart(region);
  const cart = useUiStore((s) => s.cart);
  const [step, setStep] = useState(1);
  const [gateway, setGateway] = useState('stripe');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shipping, setShipping] = useState({
    firstName: '', lastName: '', addressLine1: '', city: '', countryCode: REGIONS[region]?.code ?? 'AE', phone: '',
  });

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setShipping({ ...shipping, [k]: e.target.value });

  async function placeOrder() {
    setError(null);
    setBusy(true);
    try {
      const { data } = await api.post<{ orderNumber: string }>('/checkout/create-order', { shipping, paymentGateway: gateway }, { country: region });
      router.push(`/${region}/checkout/confirmation?order=${data.orderNumber}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!cart) return <div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>;

  const stepValid =
    (step === 2 && (!shipping.firstName || !shipping.lastName || !shipping.addressLine1 || !shipping.city))
      ? false : true;

  return (
    <div className="container-ws py-10">
      {/* Stepper */}
      <header className="mb-6 max-w-2xl">
        <div className="section-eyebrow">Secure Checkout</div>
        <h1 className="mt-1 text-3xl font-extrabold">Place your order</h1>
        <div className="mt-5 flex items-center gap-3">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const active = step === idx;
            const done = step > idx;
            return (
              <div key={s} className="flex items-center gap-3 flex-1">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm transition ${done ? 'bg-status-success text-white' : active ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30' : 'bg-gray-200 text-brand-gray'}`}>
                  {done ? '✓' : idx}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-[10px] uppercase tracking-[0.18em] font-bold ${active ? 'text-brand-blue' : 'text-brand-gray'}`}>Step {idx}</div>
                  <div className={`text-sm font-semibold ${active ? 'text-brand-dark' : 'text-brand-gray'}`}>{s}</div>
                </div>
                {idx < STEPS.length && <div className={`h-px flex-1 ${done ? 'bg-status-success' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          {step === 1 && (
            <Card title="Contact" sub="We'll send your invoice and shipping verification here.">
              <div className="rounded-xl bg-gradient-to-br from-brand-blue/5 to-transparent border border-brand-blue/15 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white font-bold flex items-center justify-center">{user?.firstName?.charAt(0) ?? 'U'}</div>
                <div className="flex-1">
                  <div className="font-semibold">{user?.email}</div>
                  <div className="text-xs text-brand-gray">{user?.firstName} {user?.lastName} · {user?.isEmailVerified ? '✓ verified' : '⚠ email not verified'}</div>
                </div>
                <span className={`badge ${user?.isEmailVerified ? 'badge-success' : 'badge-warning'}`}>{user?.isEmailVerified ? 'Ready' : 'Verify'}</span>
              </div>
              {!user?.isEmailVerified && (
                <p className="mt-3 text-sm text-status-warning">⚠ Please verify your email before placing an order. Check your inbox for the verification link.</p>
              )}
              <div className="mt-5 flex justify-end">
                <button className="btn-primary btn-lg" onClick={() => setStep(2)}>Continue to Delivery →</button>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card title="Delivery address" sub="Where should we ship this order?">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First name" v={shipping.firstName} onChange={upd('firstName')} />
                <Field label="Last name" v={shipping.lastName} onChange={upd('lastName')} />
                <div className="sm:col-span-2"><Field label="Address" v={shipping.addressLine1} onChange={upd('addressLine1')} /></div>
                <Field label="City" v={shipping.city} onChange={upd('city')} />
                <Field label="Phone" v={shipping.phone} onChange={upd('phone')} />
              </div>
              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary btn-lg" onClick={() => setStep(3)} disabled={!stepValid}>Continue to Payment →</button>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card title="Payment method" sub="Choose how you'd like to pay. All transactions are encrypted.">
              <div className="grid gap-2">
                {[
                  ['stripe', '💳 Card', 'Stripe · VISA · MC · AMEX'],
                  ['bank_transfer', '🏦 Bank Transfer', 'Manual verification by our team'],
                ].map(([v, l, sub]) => (
                  <label key={v} className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${gateway === v ? 'border-brand-blue bg-brand-blue/5 shadow-sm' : 'border-gray-200 hover:border-brand-blue/40'}`}>
                    <input type="radio" name="gw" checked={gateway === v} onChange={() => setGateway(v)} className="hidden" />
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${gateway === v ? 'border-brand-blue' : 'border-gray-300'}`}>
                      {gateway === v && <span className="h-2.5 w-2.5 rounded-full bg-brand-blue" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{l}</div>
                      <div className="text-xs text-brand-gray">{sub}</div>
                    </div>
                  </label>
                ))}
              </div>
              {error && <p className="mt-3 rounded-lg bg-status-error/10 text-status-error text-sm p-3">⚠ {error}</p>}
              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <button className="btn-ghost" onClick={() => setStep(2)}>← Back</button>
                <button className="btn-yellow btn-lg" onClick={placeOrder} disabled={!user?.isEmailVerified || busy}>
                  {busy ? 'Placing…' : 'Place Order'} 🔒
                </button>
              </div>
              <p className="mt-3 text-[11px] text-brand-gray text-center">By placing this order you agree to our Terms & Privacy Policy.</p>
            </Card>
          )}
        </div>

        <aside className="lg:sticky lg:top-[150px] lg:h-fit space-y-3">
          <div className="card p-5">
            <h2 className="text-base font-extrabold">Order summary</h2>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
              {cart.items.map((it) => (
                <div key={it.variantId} className="flex items-center gap-3 text-sm">
                  <div className="h-10 w-10 rounded-md overflow-hidden bg-brand-light shrink-0">
                    <img src={productImage({ productId: it.productId })} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="line-clamp-1 font-medium">{it.title}</div>
                    <div className="text-[11px] text-brand-gray font-mono">{it.variantSku} · ×{it.quantity}</div>
                  </div>
                  <div className="font-mono text-sm font-semibold">{formatCurrency(it.lineSubtotal, cart.currencyCode)}</div>
                </div>
              ))}
            </div>
            <div className="divider-gradient my-3" />
            <div className="space-y-1.5 text-sm text-brand-gray">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(cart.totals.subtotal, cart.currencyCode)}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>{formatCurrency(cart.totals.shippingAmount, cart.currencyCode)}</span></div>
              <div className="flex justify-between"><span>VAT</span><span>{formatCurrency(cart.totals.taxAmount, cart.currencyCode)}</span></div>
            </div>
            <div className="mt-3 flex justify-between text-lg font-extrabold">
              <span>Total</span>
              <span className="font-mono text-brand-blue">{formatCurrency(cart.totals.totalAmount, cart.currencyCode)}</span>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3 text-xs">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="font-bold">100% Secure Checkout</div>
              <div className="text-brand-gray">TLS 1.3 · PCI DSS · No card data stored</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="card p-6 md:p-7 fade-up">
      <h2 className="text-lg font-extrabold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-brand-gray">{sub}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, v, onChange }: { label: string; v: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{label}</span>
      <input className="input mt-1.5" value={v} onChange={onChange} />
    </label>
  );
}
