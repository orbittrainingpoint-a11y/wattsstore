'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ProductDetail, VariantDetail } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/lib/useCart';
import { api } from '@/lib/api';
import { RatingStars } from '@/components/ui/RatingStars';
import { TrustStrip } from './TrustStrip';
import { PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/images';
import { useExchangeRates, REGION_CURRENCY } from '@/lib/useExchangeRates';
import { useUiStore } from '@/stores/uiStore';
import { useAuth } from '@/lib/useAuth';
import { useRouter } from 'next/navigation';

const ORIGIN_CLASS: Record<string, string> = { Indian: 'chip-india', Chinese: 'chip-china', German: 'chip-germany' };
const ORIGIN_LABEL: Record<string, string> = { Indian: '🇮🇳 India', Chinese: '🇨🇳 China', German: '🇩🇪 Germany' };

/** PDP gallery + buy-box. Used by app/[country]/products/[slug]/page.tsx. */
export function ProductView({ product, region, currency, showPrice = true }: { product: ProductDetail; region: string; currency: string; showPrice?: boolean }) {
  const { addItem } = useCart(region);
  const { user } = useAuth();
  const router = useRouter();
  const setQuoteCount = useUiStore((state) => state.setQuoteCount);
  const [selected, setSelected] = useState<VariantDetail | null>(product.variants[0] ?? null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [wished, setWished] = useState(false);

  const schema = product.variantSchema ?? [];
  const { rates, convert } = useExchangeRates();
  const regionCurrency = REGION_CURRENCY[region] ?? currency;
  const pdpCurrency = rates?.enabled ? regionCurrency : currency;
  function pdpPrice(amount: number | null | undefined) {
    if (amount == null) return null;
    return rates?.enabled ? convert(amount, currency, regionCurrency) : amount;
  }
  const attrValues = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const v of product.variants) {
      for (const [k, val] of Object.entries(v.attributes)) (map[k] ??= new Set()).add(String(val));
    }
    return map;
  }, [product.variants]);

  const [picked, setPicked] = useState<Record<string, string>>(() => (product.variants[0]?.attributes as Record<string, string>) ?? {});

  function pick(field: string, value: string) {
    const next = { ...picked, [field]: value };
    setPicked(next);
    const match = product.variants.find((v) => Object.entries(next).every(([k, val]) => String(v.attributes[k]) === val));
    if (match) setSelected(match);
  }

  async function addToCart() {
    if (!selected) return;
    if (!user) {
      router.push(`/auth/login?next=/${region}/products/${product.slug}`);
      return;
    }
    try { await addItem(selected.id, qty); setMsg('Added to cart'); }
    catch (e) { setMsg((e as Error).message); }
  }

  async function addToQuote() {
    if (!selected) return;
    if (!user) {
      router.push(`/auth/login?next=/${region}/products/${product.slug}`);
      return;
    }
    try {
      const { data } = await api.post<{ items: { variantId: number }[] }>('/quote/basket/items', { variantId: selected.id, targetQuantity: qty }, { country: region });
      setQuoteCount(data.items.length);
      setMsg('Added to quote basket');
    } catch (e) { setMsg((e as Error).message); }
  }

  const discountPct = selected?.compareAtPrice && selected.price && selected.compareAtPrice > selected.price
    ? Math.round(((selected.compareAtPrice - selected.price) / selected.compareAtPrice) * 100)
    : 0;

  const stockBadge = !selected
    ? null
    : selected.stockAvailable > selected.stockLowThreshold
      ? <span className="badge-success font-bold">✅ In Stock — {selected.stockAvailable} units available</span>
      : selected.stockAvailable > 0
        ? <span className="badge-warning font-bold">⚠ Only {selected.stockAvailable} left — order soon</span>
        : <span className="badge-error font-bold">❌ Out of Stock — RFQ available</span>;

  // Only show real images. If the product has none, show a single placeholder tile so the
  // gallery doesn't pad itself with random catalogue photos the admin never uploaded.
  const galleryImages = product.images.length > 0
    ? product.images
    : [{ url: PRODUCT_IMAGE_PLACEHOLDER, alt: product.title, isPrimary: false }];

  return (
    <div className="grid gap-8 lg:grid-cols-[58%_42%]">
      {/* LEFT — Gallery */}
      <div>
        <div className="card overflow-hidden">
          <div className="aspect-square relative bg-brand-light">
            {discountPct > 0 && (
              <div className="absolute left-4 top-4 z-10 badge bg-status-error text-white shadow-sm">-{discountPct}% OFF</div>
            )}
            {product.brandOrigin && ORIGIN_CLASS[product.brandOrigin] && (
              <div className={`chip-origin absolute right-4 top-4 z-10 ${ORIGIN_CLASS[product.brandOrigin]}`}>{ORIGIN_LABEL[product.brandOrigin]}</div>
            )}
            <img src={galleryImages[activeImg]?.url || PRODUCT_IMAGE_PLACEHOLDER} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute bottom-3 right-3 text-xs bg-white/95 text-brand-dark px-2 py-1 rounded font-medium">{activeImg + 1} / {galleryImages.length}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {galleryImages.slice(0, 6).map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={`aspect-square rounded-lg border-2 overflow-hidden bg-brand-light transition ${i === activeImg ? 'border-brand-blue shadow-card' : 'border-transparent hover:border-brand-blue/40'}`}
              aria-label={`Image ${i + 1}`}
            >
              <img src={img.url || PRODUCT_IMAGE_PLACEHOLDER} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {(product.documents ?? []).map((doc) => (
            <a key={doc.id} className="btn-outline btn-sm" href={doc.fileUrl} target="_blank" rel="noreferrer">⬇ {doc.title}</a>
          ))}
          <button className="btn-outline btn-sm" onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(window.location.href).catch(() => {}); }}>🔗 Share Product</button>
        </div>
      </div>

      {/* RIGHT — Buy Box (sticky on lg+) */}
      <div className="lg:sticky lg:top-[150px] lg:h-fit">
        <div className="card p-6">
          {product.brand && (
            <Link href={`/${region}/brands/${product.brand.slug}`} className="text-xs font-bold uppercase tracking-wider text-brand-blue hover:underline">
              {product.brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl md:text-[28px] font-extrabold leading-tight">{product.title}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-brand-gray">
            <span className="font-mono">SKU: {product.skuBase}</span>
            <span>·</span>
            <RatingStars value={product.averageRating ?? 0} showValue count={product.reviewCount} />
            <span>·</span>
            <a href="#reviews" className="text-brand-blue hover:underline">Read reviews</a>
          </div>

          <div className="mt-5 flex items-baseline gap-3 flex-wrap">
            {product.isPriceVisible && showPrice ? (
              <>
                <span className="font-mono text-3xl font-extrabold text-brand-blue">{formatCurrency(pdpPrice(selected?.price), pdpCurrency)}</span>
                {selected?.compareAtPrice && selected.price && selected.compareAtPrice > selected.price && (
                  <span className="text-base text-brand-gray line-through">{formatCurrency(pdpPrice(selected.compareAtPrice), pdpCurrency)}</span>
                )}
                {rates?.enabled && rates.showBothCurrencies && selected?.price != null && pdpCurrency !== currency && (
                  <span className="text-sm text-brand-gray">({formatCurrency(selected.price, currency)})</span>
                )}
                {discountPct > 0 && <span className="badge-error font-bold">SAVE {discountPct}%</span>}
              </>
            ) : (
              <span className="text-2xl font-bold text-brand-gray">Contact for Price</span>
            )}
          </div>
          <div className="mt-1 text-xs text-brand-gray">Regional price shown for the selected variant.</div>

          <div className="mt-4 space-y-2">
            <div>{stockBadge}</div>
            <div className="rounded border border-brand-blue/20 bg-brand-blue/5 px-3 py-2 text-xs text-brand-gray">Delivery timing is confirmed at checkout or on your formal quotation.</div>
          </div>

          <div className="mt-6 space-y-4">
            {schema.map((field) => (
              <div key={field.field}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-gray">{field.label}</p>
                <div className="flex flex-wrap gap-2">
                  {[...(attrValues[field.field] ?? [])].map((val) => {
                    const isActive = picked[field.field] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => pick(field.field, val)}
                        className={`rounded border-2 px-3 py-1.5 text-sm font-semibold transition ${isActive ? 'border-brand-blue bg-brand-blue text-white' : 'border-gray-200 bg-white hover:border-brand-blue'}`}
                      >{val}</button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-stretch gap-2">
            <div className="flex items-center rounded border border-gray-200">
              <button className="px-3 py-2.5 hover:bg-gray-50" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <span className="w-12 text-center font-bold">{qty}</span>
              <button className="px-3 py-2.5 hover:bg-gray-50" onClick={() => setQty(qty + 1)}>+</button>
            </div>
            <button
              aria-label="Add to wishlist"
              onClick={() => setWished((w) => !w)}
              className={`rounded border border-gray-200 px-3 ${wished ? 'text-status-error' : ''}`}
            >{wished ? '♥' : '♡'}</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {product.isPriceVisible && showPrice && (
              <button className="btn-primary btn-lg" disabled={!selected || selected.stockAvailable === 0} onClick={addToCart}>
                🛒 Add to Cart
              </button>
            )}
            <button className="btn-yellow btn-lg" onClick={addToQuote}>📋 Add to Quote</button>
            {product.isPriceVisible && showPrice && <button className="btn-outline btn-lg col-span-2" disabled={!selected || selected.stockAvailable === 0} onClick={addToCart}>Buy Now</button>}
          </div>
          {msg && <p className="mt-2 text-sm text-status-success font-medium">✓ {msg}</p>}

          <TrustStrip />

          <div className="mt-5 border-t border-gray-100 pt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-base">📐</div>
              <div className="mt-1 font-semibold">Documents</div>
              <div className="text-brand-gray">{(product.documents ?? []).length > 0 ? `${(product.documents ?? []).length} download${(product.documents ?? []).length === 1 ? '' : 's'}` : 'Request details'}</div>
            </div>
            <div className="text-center border-x border-gray-100">
              <div className="text-base">🛠️</div>
              <div className="mt-1 font-semibold">Contact Sales</div>
              <div className="text-brand-gray">Product questions</div>
            </div>
            <div className="text-center">
              <div className="text-base">🏷️</div>
              <div className="mt-1 font-semibold">Bulk Pricing</div>
              <div className="text-brand-gray">Request pricing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-only sticky buy bar — sits above the BottomNav (bottom-16) */}
      <div
        className="lg:hidden fixed inset-x-0 z-30 glass border-t border-gray-200 px-4 py-3"
        style={{ bottom: 'calc(64px + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {product.isPriceVisible && showPrice ? (
              <div className="font-mono text-lg font-extrabold text-brand-blue truncate">{formatCurrency(pdpPrice(selected?.price), pdpCurrency)}</div>
            ) : (
              <div className="text-sm font-bold text-brand-gray">Contact for Price</div>
            )}
            <div className="text-[11px] text-brand-gray truncate">{selected?.variantSku ?? product.skuBase}</div>
          </div>
          {product.isPriceVisible && showPrice && (
            <button onClick={addToCart} disabled={!selected || selected.stockAvailable === 0} className="btn-primary">
              Add
            </button>
          )}
          <button onClick={addToQuote} className="btn-yellow">Quote</button>
        </div>
      </div>
    </div>
  );
}
