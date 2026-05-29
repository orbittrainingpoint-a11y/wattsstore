'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { loadSiteSettings, SiteSettings } from '@/lib/cms';

export function OfferPopup({ region }: { region: string }) {
  const [popup, setPopup] = useState<SiteSettings['offerPopup'] | null>(null);

  useEffect(() => {
    loadSiteSettings().then((settings) => {
      const next = settings?.offerPopup;
      if (!next?.enabled) return;
      const key = `watts-offer-popup-${next.title}`;
      const lastSeen = Number(localStorage.getItem(key) ?? 0);
      if (Date.now() - lastSeen < next.frequencyHours * 60 * 60 * 1000) return;
      setPopup(next);
      localStorage.setItem(key, String(Date.now()));
    }).catch(() => undefined);
  }, []);

  if (!popup) return null;
  const href = popup.ctaUrl.replace(/^\/(ae|ke|de|global)(?=\/)/, `/${region}`);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className="card max-w-md p-6 shadow-modal">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-eyebrow">Offer</div>
            <h2 className="mt-1 text-2xl font-extrabold">{popup.title}</h2>
          </div>
          <button className="text-2xl text-brand-gray" onClick={() => setPopup(null)} aria-label="Close">x</button>
        </div>
        <p className="mt-3 text-sm text-brand-gray">{popup.body}</p>
        <div className="mt-5 flex gap-2">
          <Link href={href} onClick={() => setPopup(null)} className="btn-primary flex-1 text-center">{popup.ctaLabel}</Link>
          <button className="btn-outline" onClick={() => setPopup(null)}>Close</button>
        </div>
      </div>
    </div>
  );
}
