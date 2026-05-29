'use client';

import Link from 'next/link';
import { useUiStore } from '@/stores/uiStore';
import { useCart } from '@/lib/useCart';
import { formatCurrency } from '@/lib/utils';
import { productImage } from '@/lib/images';

export function CartDrawer({ region }: { region: string }) {
  const { cartOpen, setCartOpen, cart } = useUiStore();
  const { updateItem, removeItem } = useCart(region);

  if (!cartOpen) return null;
  const c = cart;
  const itemCount = c?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Shopping cart">
      <div className="absolute inset-0 bg-brand-dark/50 backdrop-blur-[2px]" onClick={() => setCartOpen(false)} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col fade-up">
        {/* Header — gradient */}
        <header className="relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg,#0b1f3d 0%,#1e4d8c 100%)' }}>
          <span className="blob h-40 w-40 -top-10 -right-10 bg-brand-yellow" />
          <div className="relative flex items-center justify-between p-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-brand-yellow font-bold">Your Cart</div>
              <h2 className="mt-0.5 text-xl font-extrabold">{itemCount} item{itemCount === 1 ? '' : 's'}</h2>
            </div>
            <button onClick={() => setCartOpen(false)} aria-label="Close" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-xl">×</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-brand-light">
          {!c || c.items.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl">🛒</div>
              <p className="mt-3 font-semibold">Your cart is empty</p>
              <p className="text-xs text-brand-gray">Browse the catalog and start adding items.</p>
              <Link href={`/${region}`} onClick={() => setCartOpen(false)} className="btn-primary mt-5 inline-flex">Shop Catalog</Link>
            </div>
          ) : (
            c.items.map((it) => (
              <div key={it.variantId} className="card p-3 flex gap-3">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-brand-light shrink-0">
                  <img src={productImage({ productId: it.productId })} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1">{it.title}</p>
                  <p className="font-mono text-[11px] text-brand-gray">{it.variantSku}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="inline-flex items-center rounded-lg border border-gray-200">
                      <button className="px-2 py-1 hover:bg-gray-50 text-sm" onClick={() => updateItem(it.variantId, it.quantity - 1)}>−</button>
                      <span className="px-2 text-sm font-semibold">{it.quantity}</span>
                      <button className="px-2 py-1 hover:bg-gray-50 text-sm" onClick={() => updateItem(it.variantId, it.quantity + 1)}>+</button>
                    </div>
                    <button className="ml-auto text-xs text-status-error hover:underline" onClick={() => removeItem(it.variantId)}>Remove</button>
                  </div>
                </div>
                <div className="text-sm font-bold text-brand-blue font-mono whitespace-nowrap">{formatCurrency(it.lineSubtotal, c.currencyCode)}</div>
              </div>
            ))
          )}
        </div>

        {c && c.items.length > 0 && (
          <div className="glass border-t border-gray-200 p-5 space-y-2">
            <Row label="Subtotal" value={formatCurrency(c.totals.subtotal, c.currencyCode)} />
            {c.totals.discountAmount > 0 && <Row label="Discount" value={`− ${formatCurrency(c.totals.discountAmount, c.currencyCode)}`} accent />}
            <Row label="Shipping" value={formatCurrency(c.totals.shippingAmount, c.currencyCode)} />
            <Row label="VAT" value={formatCurrency(c.totals.taxAmount, c.currencyCode)} />
            <div className="divider-gradient my-2" />
            <div className="flex justify-between text-base font-extrabold">
              <span>Total</span>
              <span className="font-mono text-brand-blue">{formatCurrency(c.totals.totalAmount, c.currencyCode)}</span>
            </div>
            <Link href={`/${region}/checkout`} onClick={() => setCartOpen(false)} className="btn-primary w-full mt-3">
              Proceed to Checkout →
            </Link>
            <Link href={`/${region}/cart`} onClick={() => setCartOpen(false)} className="btn-ghost w-full text-xs">View Full Cart</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${accent ? 'text-status-success font-semibold' : 'text-brand-gray'}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
