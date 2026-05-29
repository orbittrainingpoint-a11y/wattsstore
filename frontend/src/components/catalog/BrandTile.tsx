import Link from 'next/link';

export interface BrandTileData {
  name: string;
  slug: string;
  origin?: 'Indian' | 'Chinese' | 'German';
  initial?: string;
}

const ORIGIN: Record<string, { class: string; label: string }> = {
  Indian: { class: 'chip-india', label: '🇮🇳' },
  Chinese: { class: 'chip-china', label: '🇨🇳' },
  German: { class: 'chip-germany', label: '🇩🇪' },
};

/** Square brand tile with monogram + origin chip. */
export function BrandTile({ region, brand }: { region: string; brand: BrandTileData }) {
  const initial = brand.initial ?? brand.name.charAt(0).toUpperCase();
  const origin = brand.origin ? ORIGIN[brand.origin] : null;
  return (
    <Link
      href={`/${region}/brands/${brand.slug}`}
      className="card card-hover relative flex flex-col items-center justify-center p-5 text-center min-h-[120px]"
    >
      {origin && <span className={`chip-origin absolute top-2 right-2 ${origin.class}`}>{origin.label}</span>}
      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-brand-blue-700 text-white text-xl font-bold tracking-tight">
        {initial}
      </div>
      <div className="mt-3 text-sm font-semibold text-brand-dark">{brand.name}</div>
      <div className="text-[11px] text-brand-gray">Industrial Grade</div>
    </Link>
  );
}
