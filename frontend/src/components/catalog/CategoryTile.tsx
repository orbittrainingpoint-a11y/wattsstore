import Link from 'next/link';
import { categoryImage } from '@/lib/images';

export interface CategoryTileData {
  name: string;
  slug: string;
  count?: string;
  icon?: string;       // legacy — ignored when image is used
  gradient?: string;   // legacy
  image?: string;      // optional explicit tile image override (CMS imageUrl)
  iconUrl?: string;    // CMS-managed small icon — overlays the tile when present
}

/** Square category tile used on homepage "Shop by Category" + PLP sub-category grids. */
export function CategoryTile({ region, data }: { region: string; data: CategoryTileData }) {
  const src = data.image ?? data.iconUrl ?? categoryImage(data.slug);
  return (
    <Link
      href={`/${region}/categories/${data.slug}`}
      className="group card card-hover flex flex-col items-center text-center p-3 md:p-4"
    >
      <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-brand-light">
        <img
          src={src}
          alt={data.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {data.iconUrl && data.image && (
          <img
            src={data.iconUrl}
            alt=""
            aria-hidden
            className="absolute right-2 bottom-2 h-9 w-9 rounded-lg bg-white p-1 shadow-md object-contain"
          />
        )}
      </div>
      <div className="mt-3 text-sm font-semibold text-brand-dark line-clamp-2 min-h-[40px]">{data.name}</div>
      {data.count && <div className="mt-1 text-[11px] text-brand-gray">{data.count}</div>}
    </Link>
  );
}
