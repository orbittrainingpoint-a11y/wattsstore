'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ProductCard as TProductCard } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCart } from '@/lib/useCart';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { RatingStars } from '@/components/ui/RatingStars';
import { productImage } from '@/lib/images';
import { useAuth } from '@/lib/useAuth';
import { useUiStore } from '@/stores/uiStore';
import { useExchangeRates, REGION_CURRENCY } from '@/lib/useExchangeRates';

const ORIGIN_CLASS: Record<string, string> = { Indian: 'chip-india', Chinese: 'chip-china', German: 'chip-germany' };
const ORIGIN_LABEL: Record<string, string> = { Indian: '🇮🇳 India', Chinese: '🇨🇳 China', German: '🇩🇪 Germany' };

/** Industrial-style product card. Used on homepage rails, PLP grid, search, related/cross-sell strips. */
export function ProductCard({
  product,
  region,
  currency,
  size = 'md',
  showPrice = true,
}: {
  product: TProductCard;
  region: string;
  currency: string;
  size?: 'sm' | 'md';
  showPrice?: boolean;
}) {
  const { addItem } = useCart(region);
  const { user } = useAuth();
  const router = useRouter();
  const setQuoteCount = useUiStore((state) => state.setQuoteCount);
  const [busy, setBusy] = useState(false);
  const [wished, setWished] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const { rates, convert } = useExchangeRates();

  // When real-time currency display is enabled, convert the stored regional price
  // to the active country's currency using live rates + admin margin.
  const regionCurrency = REGION_CURRENCY[region] ?? currency;
  const displayPrice = rates?.enabled && product.price != null
    ? convert(product.price, currency, regionCurrency)
    : product.price;
  const displayCompare = rates?.enabled && product.compareAtPrice != null
    ? convert(product.compareAtPrice, currency, regionCurrency)
    : product.compareAtPrice;
  const displayCurrency = rates?.enabled ? regionCurrency : currency;

  const discountPct =
    product.price && product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
      : 0;

  async function quickAdd() {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api.get<{ variants: { id: number; stockAvailable: number }[] }>(`/catalog/products/${product.slug}`, { country: region });
      const v = data.variants.find((x) => x.stockAvailable > 0) ?? data.variants[0];
      if (v) {
        await addItem(v.id, 1);
        setMsg('Added');
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleWish(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { router.push('/auth/login'); return; }
    const next = !wished;
    setWished(next);
    try {
      if (next) await api.post('/wishlist', { productId: product.id });
      else await api.del(`/wishlist/${product.id}`);
    } catch (err) {
      setWished(!next); // revert
      setMsg((err as Error).message);
    }
  }

  async function quickAddCart(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { router.push('/auth/login'); return; }
    return quickAdd();
  }

  async function quickQuote(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    if (!user) { router.push(`/auth/login?next=/${region}/products/${product.slug}`); return; }
    setBusy(true);
    setMsg(null);
    try {
      const { data: detail } = await api.get<{ variants: { id: number }[] }>(`/catalog/products/${product.slug}`, { country: region });
      const variant = detail.variants[0];
      if (!variant) return;
      const { data } = await api.post<{ items: { variantId: number }[] }>('/quote/basket/items', { variantId: variant.id, targetQuantity: 1 }, { country: region });
      setQuoteCount(data.items.length);
      setMsg('Quoted');
    } catch (error) {
      setMsg((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`card card-hover group relative flex h-full flex-col overflow-hidden ${size === 'sm' ? 'w-[200px]' : ''}`}>
      {/* Top-left ribbon stack */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        {product.brandOrigin && ORIGIN_CLASS[product.brandOrigin] && (
          <span className={`chip-origin ${ORIGIN_CLASS[product.brandOrigin]}`}>{ORIGIN_LABEL[product.brandOrigin]}</span>
        )}
        {discountPct > 0 && (
          <span className="badge bg-status-error text-white shadow-sm">{discountPct}% OFF</span>
        )}
      </div>

      {/* Wishlist heart */}
      <button
        aria-label="Add to wishlist"
        onClick={toggleWish}
        className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-white/95 border border-gray-200 text-base flex items-center justify-center transition hover:bg-brand-blue hover:text-white"
      >
        <span className={wished ? 'text-status-error' : ''}>{wished ? '♥' : '♡'}</span>
      </button>

      {/* Image */}
      <Link href={`/${region}/products/${product.slug}`} className="block">
        <div className="aspect-product relative overflow-hidden bg-brand-light">
          <img
            src={productImage({ url: product.image, productId: product.id })}
            alt={product.title}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {!product.inStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
              <span className="badge bg-status-error text-white">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3">
        {product.brand && <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-blue">{product.brand.name}</div>}
        <Link href={`/${region}/products/${product.slug}`} className="mt-0.5 block">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-brand-dark hover:text-brand-blue min-h-[40px]">{product.title}</h3>
        </Link>

        <div className="mt-1.5 flex items-center gap-2 text-xs">
          <RatingStars value={product.averageRating ?? 0} count={product.reviewCount} />
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          {product.isPriceVisible && showPrice ? (
            <>
              <span className="font-mono text-base font-bold text-brand-blue">{formatCurrency(displayPrice, displayCurrency)}</span>
              {displayCompare && displayPrice && displayCompare > displayPrice && (
                <span className="text-xs text-brand-gray line-through">{formatCurrency(displayCompare, displayCurrency)}</span>
              )}
              {rates?.enabled && rates.showBothCurrencies && product.price != null && displayCurrency !== currency && (
                <span className="text-[11px] text-brand-gray">({formatCurrency(product.price, currency)})</span>
              )}
            </>
          ) : (
            <span className="text-sm font-semibold text-brand-gray">Contact for Price</span>
          )}
        </div>

        <div className="mt-1 text-[11px] text-brand-gray">{product.variantCount} variant{product.variantCount === 1 ? '' : 's'} available</div>

        <div className="mt-3 flex gap-2">
          {product.isPriceVisible && showPrice ? (
            <button className="btn-primary btn-sm flex-1" disabled={!product.inStock || busy} onClick={quickAddCart}>
              {busy ? '…' : msg ?? 'Add to Cart'}
            </button>
          ) : (
            <Link href={`/${region}/products/${product.slug}`} className="btn-outline btn-sm flex-1">Contact for Price</Link>
          )}
          <button onClick={quickQuote} className="btn-yellow btn-sm" aria-label="Add to quote basket">RFQ</button>
        </div>
      </div>
    </article>
  );
}
