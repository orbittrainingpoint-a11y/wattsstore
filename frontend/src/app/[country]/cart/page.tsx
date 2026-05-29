'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useCart } from '@/lib/useCart';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { productImage, ILLUSTRATIONS } from '@/lib/images';
import { DynamicPromoBanner } from '@/components/ui/DynamicPromoBanner';
import { useRouteParams } from '@/lib/useRouteParams';

export default function CartPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const { refresh, updateItem, removeItem, applyCoupon, removeCoupon } = useCart(region);
  const cart = useUiStore((s) => s.cart);
  const [coupon, setCoupon] = useState('');
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState<string | null>(null);

  useEffect(() => { void refresh(); }, [refresh]);

  async function onApply() {
    try { await applyCoupon(coupon); setCouponMsg('Coupon applied'); }
    catch (e) { setCouponMsg((e as Error).message); }
  }

  async function proceedToQuote() {
    if (!cart?.items.length) return;
    setQuoteBusy(true);
    setQuoteMsg(null);
    try {
      await Promise.all(cart.items.map((item) =>
        api.post('/quote/basket/items', {
          variantId: item.variantId,
          targetQuantity: Math.max(item.quantity, 10),
          customerRemarks: `Converted from cart with ${item.quantity} unit(s).`,
        }, { country: region }),
      ));
      window.location.href = `/${region}/quote-basket`;
    } catch (error) {
      setQuoteMsg((error as Error).message);
    } finally {
      setQuoteBusy(false);
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-ws py-16">
        <div className="card max-w-lg mx-auto p-8 md:p-10 text-center">
          <img src={ILLUSTRATIONS.emptyCart} alt="" className="mx-auto w-full max-w-xs" />
          <h1 className="mt-4 text-2xl font-extrabold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-brand-gray max-w-sm mx-auto">Browse the catalog and we'll start filling it with verified industrial gear.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href={`/${region}`} className="btn-primary">Shop Catalog</Link>
            <Link href={`/${region}/quote-basket`} className="btn-outline">Request a Quote</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-ws py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Your Cart</div>
          <h1 className="mt-1 text-3xl font-extrabold">{cart.items.length} item{cart.items.length === 1 ? '' : 's'} <span className="text-brand-gray font-medium">· secure checkout</span></h1>
        </div>
        <Link href={`/${region}`} className="text-sm text-brand-blue link-underline">← Continue shopping</Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {cart.items.map((it) => (
            <div key={it.variantId} className="card p-4 flex items-center gap-4">
              <div className="h-20 w-20 rounded-lg overflow-hidden bg-brand-light shrink-0">
                <img src={productImage({ productId: it.productId })} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/${region}/products/${it.slug}`} className="font-semibold hover:text-brand-blue line-clamp-1">{it.title}</Link>
                <p className="font-mono text-[11px] text-brand-gray">{it.variantSku}</p>
                {it.priceChanged && <p className="text-xs text-status-warning mt-1">⚠ Price updated since added</p>}
                <div className="mt-2 flex items-center gap-3 text-xs text-brand-gray">
                  <span className="badge-success">In stock</span>
                  <span>·</span>
                  <span>Ships in 1–3 days</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center rounded-lg border border-gray-200">
                  <button className="px-3 py-1.5 hover:bg-gray-50" onClick={() => updateItem(it.variantId, it.quantity - 1)}>−</button>
                  <span className="w-9 text-center text-sm font-bold">{it.quantity}</span>
                  <button className="px-3 py-1.5 hover:bg-gray-50" onClick={() => updateItem(it.variantId, it.quantity + 1)}>+</button>
                </div>
                <div className="font-bold text-brand-blue font-mono">{formatCurrency(it.lineSubtotal, cart.currencyCode)}</div>
                <button className="text-[11px] text-status-error hover:underline" onClick={() => removeItem(it.variantId)}>Remove</button>
              </div>
            </div>
          ))}

          {/* Trust band under list */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
            {[['🛡️','Secure checkout'],['↩️','7-day returns'],['🧾','VAT invoice'],['🚚','Free delivery']].map(([i,t]) => (
              <div key={t} className="card p-3 flex items-center gap-2 text-xs">
                <span className="text-base">{i}</span><span className="font-semibold">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:sticky lg:top-[150px] lg:h-fit space-y-3">
          <div className="card p-5">
            <h2 className="text-base font-extrabold">Order Summary</h2>
            <div className="mt-3 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(cart.totals.subtotal, cart.currencyCode)} />
              {cart.totals.discountAmount > 0 && <Row label={`Discount (${cart.couponCode})`} value={`− ${formatCurrency(cart.totals.discountAmount, cart.currencyCode)}`} accent />}
              <Row label="Shipping" value={formatCurrency(cart.totals.shippingAmount, cart.currencyCode)} />
              <Row label="VAT" value={formatCurrency(cart.totals.taxAmount, cart.currencyCode)} />
              <div className="divider-gradient my-2" />
              <div className="flex justify-between text-lg font-extrabold">
                <span>Total</span>
                <span className="font-mono text-brand-blue">{formatCurrency(cart.totals.totalAmount, cart.currencyCode)}</span>
              </div>
            </div>
            <Link href={`/${region}/checkout`} className="btn-primary w-full mt-5 btn-lg">Proceed to Checkout →</Link>
            <button className="btn-yellow w-full mt-2 btn-lg" onClick={() => void proceedToQuote()} disabled={quoteBusy}>
              {quoteBusy ? 'Adding to quote...' : 'Proceed to Quote →'}
            </button>
            {quoteMsg && <p className="mt-2 text-xs text-status-error">{quoteMsg}</p>}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-brand-gray justify-center">
              <span>🔒 SSL · PCI compliant</span><span>·</span><span>VISA · MC · AMEX</span>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-gray">Coupon code</div>
            {cart.couponCode ? (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-status-success/30 bg-status-success/5 px-3 py-2">
                <div>
                  <div className="text-xs text-brand-gray">Applied</div>
                  <div className="font-mono font-bold text-status-success">{cart.couponCode}</div>
                </div>
                <button onClick={() => removeCoupon()} className="text-xs text-status-error hover:underline font-semibold">Remove</button>
              </div>
            ) : (
              <>
                <div className="mt-2 flex gap-2">
                  <input className="input" placeholder="Enter code" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                  <button className="btn-yellow shrink-0" onClick={onApply}>Apply</button>
                </div>
                {couponMsg && <p className="mt-2 text-xs text-brand-gray">{couponMsg}</p>}
                <p className="mt-3 text-[11px] text-brand-gray">Try <code className="font-mono text-brand-blue">WELCOME10</code> for 10% off your first order.</p>
              </>
            )}
          </div>

          <DynamicPromoBanner
            region={region}
            placement="sidebar"
            compact
            fallback={{ eyebrow: 'B2B', title: 'Buying 10+ units? Get project pricing.', cta: 'Convert to RFQ', href: `/${region}/quote-basket`, image: '/img/banners/cms/b2b-hero.jpg', tone: 'dark' }}
          />
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? 'text-status-success font-semibold' : 'text-brand-gray'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
