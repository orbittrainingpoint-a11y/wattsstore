import Link from 'next/link';

export interface BannerTileProps {
  href: string;
  eyebrow?: string;
  title: React.ReactNode;
  cta?: string;
  image?: string;
  tone?: 'blue' | 'yellow' | 'mint' | 'violet' | 'dark';
  big?: boolean;
  compact?: boolean;
}

const TONE: Record<string, { accent: string }> = {
  blue: { accent: 'text-brand-yellow' },
  yellow: { accent: 'text-brand-yellow' },
  mint: { accent: 'text-brand-yellow' },
  violet: { accent: 'text-brand-yellow' },
  dark: { accent: 'text-brand-yellow' },
};

/** CMS image banner with a fixed dark veil so editorial copy always remains readable. */
export function BannerTile({ href, eyebrow, title, cta = 'Explore', image, tone = 'blue', big = false, compact = false }: BannerTileProps) {
  const t = TONE[tone] ?? TONE.blue;
  const height = compact ? 'min-h-[176px]' : big ? 'min-h-[280px] md:min-h-[352px]' : 'min-h-[220px]';

  return (
    <Link
      href={href}
      className={`banner-tile group block h-full ${height} relative overflow-hidden text-white focus-visible:outline-white`}
    >
      {image && (
        <img
          src={image}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-[#071321]/35 transition-colors duration-300 group-hover:bg-[#071321]/45" />
      <span className="absolute inset-0 bg-gradient-to-r from-[#071321]/95 via-[#071321]/72 to-[#071321]/16" />
      <span className="absolute inset-0 bg-gradient-to-t from-[#071321]/64 via-transparent to-[#071321]/22" />
      <span className="absolute inset-0 grid-lines opacity-10" />

      <div className={`relative flex h-full flex-col ${compact ? 'p-5' : 'p-5 md:p-7'}`}>
        {eyebrow && (
          <div className={`section-eyebrow !text-[10px] ${t.accent}`}>
            <span>{eyebrow}</span>
          </div>
        )}
        <h3 className={`mt-3 !text-white font-extrabold leading-tight ${big ? 'text-2xl md:text-4xl max-w-md drop-shadow-lg' : 'text-lg md:text-xl max-w-xs drop-shadow-md'}`}>
          {title}
        </h3>
        <div className="mt-auto flex items-center gap-2 pt-6 text-sm font-semibold">
          <span className="link-underline">{cta}</span>
          <span className="transition-transform group-hover:translate-x-1">-&gt;</span>
        </div>
      </div>
    </Link>
  );
}
