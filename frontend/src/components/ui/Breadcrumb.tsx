import Link from 'next/link';

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-brand-gray">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {it.href && !last ? (
                <Link href={it.href} className="hover:text-brand-blue">{it.label}</Link>
              ) : (
                <span className={last ? 'text-brand-dark font-medium' : ''}>{it.label}</span>
              )}
              {!last && <span aria-hidden>/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
