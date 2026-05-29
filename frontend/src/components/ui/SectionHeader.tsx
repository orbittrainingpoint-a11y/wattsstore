import Link from 'next/link';

/** Section heading with optional eyebrow, subtitle, and right-aligned view-all link. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = 'View All',
  align = 'left',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  viewAllHref?: string;
  viewAllLabel?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={`mb-6 md:mb-8 flex flex-wrap items-end justify-between gap-3 ${align === 'center' ? 'text-center justify-center' : ''}`}>
      <div className={align === 'center' ? 'mx-auto max-w-xl' : ''}>
        {eyebrow && <div className="section-eyebrow mb-2">{eyebrow}</div>}
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-brand-gray max-w-2xl">{subtitle}</p>}
      </div>
      {viewAllHref && (
        <Link href={viewAllHref} className="text-sm font-semibold text-brand-blue hover:underline shrink-0">
          {viewAllLabel} →
        </Link>
      )}
    </div>
  );
}
