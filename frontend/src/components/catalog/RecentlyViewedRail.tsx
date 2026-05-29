'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readRecent, pushRecent, RecentItem } from '@/lib/recentlyViewed';
import { productImage } from '@/lib/images';
import { Rail } from '@/components/ui/Rail';

interface Props {
  region: string;
  /** When provided, the component records this visit on mount before rendering the rail. */
  recordVisit?: { slug: string; title: string; image?: string | null; productId: number };
  /** Optional title override; rail hidden entirely when there's nothing to show. */
  title?: string;
}

export function RecentlyViewedRail({ region, recordVisit, title = 'Recently viewed' }: Props) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (recordVisit) pushRecent(recordVisit);
    // exclude current product from the rail
    setItems(readRecent().filter((x) => x.slug !== recordVisit?.slug));
  }, [recordVisit]);

  if (items.length === 0) return null;

  return (
    <section className="container-ws py-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-title">{title}</h2>
        <span className="text-xs text-brand-gray">{items.length} item{items.length === 1 ? '' : 's'}</span>
      </div>
      <Rail>
        {items.map((it) => (
          <Link key={it.slug} href={`/${region}/products/${it.slug}`} className="card card-hover w-[180px] md:w-[200px] overflow-hidden block">
            <div className="aspect-product bg-brand-light overflow-hidden">
              <img src={it.image || productImage({ productId: it.productId })} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
            </div>
            <div className="p-3">
              <div className="text-sm font-medium line-clamp-2 min-h-[40px]">{it.title}</div>
              <div className="mt-1 text-[11px] text-brand-gray">Viewed {timeAgo(it.visitedAt)}</div>
            </div>
          </Link>
        ))}
      </Rail>
    </section>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
