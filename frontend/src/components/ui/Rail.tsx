'use client';

import { useRef } from 'react';

/** Horizontal scrolling rail with prev/next arrow controls. Children must size themselves. */
export function Rail({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.85, 320), behavior: 'smooth' });
  };
  return (
    <div className={`relative group ${className}`}>
      <button
        aria-label="Scroll previous"
        onClick={() => scrollBy(-1)}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-card hover:bg-brand-blue hover:text-white hover:border-brand-blue transition opacity-0 group-hover:opacity-100"
      >‹</button>
      <div ref={ref} className="rail no-scrollbar">{children}</div>
      <button
        aria-label="Scroll next"
        onClick={() => scrollBy(1)}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 shadow-card hover:bg-brand-blue hover:text-white hover:border-brand-blue transition opacity-0 group-hover:opacity-100"
      >›</button>
    </div>
  );
}
