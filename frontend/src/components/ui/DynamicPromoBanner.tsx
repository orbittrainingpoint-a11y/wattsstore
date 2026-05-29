'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CmsBanner } from '@/lib/cms';
import { BannerTile } from '@/components/ui/BannerTile';

interface FallbackBanner {
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
  image: string;
  tone?: 'blue' | 'yellow' | 'mint' | 'violet' | 'dark';
}

export function DynamicPromoBanner({
  region,
  placement,
  index = 0,
  fallback,
  big = false,
  compact = false,
}: {
  region: string;
  placement: string;
  index?: number;
  fallback: FallbackBanner;
  big?: boolean;
  compact?: boolean;
}) {
  const [item, setItem] = useState<CmsBanner | null>(null);

  useEffect(() => {
    let active = true;
    api.get<CmsBanner[]>(`/banners?placement=${encodeURIComponent(placement)}`, { country: region })
      .then(({ data }) => { if (active) setItem(data[index] ?? null); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [index, placement, region]);

  const href = (item?.linkUrl ?? fallback.href).replace(/^\/(ae|ke|de|global)(?=\/)/, `/${region}`);
  const tone = (item?.tone as FallbackBanner['tone']) ?? fallback.tone ?? 'blue';

  return (
    <BannerTile
      eyebrow={item?.eyebrow ?? fallback.eyebrow}
      title={item?.title ?? fallback.title}
      cta={item?.ctaLabel ?? fallback.cta}
      href={href}
      image={item?.imageUrl ?? fallback.image}
      tone={tone}
      big={big}
      compact={compact}
    />
  );
}
