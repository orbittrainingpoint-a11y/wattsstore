'use client';

import { useState } from 'react';

export interface AccordionItem { q: string; a: React.ReactNode }

export function Accordion({ items, single = true }: { items: AccordionItem[]; single?: boolean }) {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));
  const toggle = (i: number) => {
    setOpen((cur) => {
      const next = new Set(single ? [] : cur);
      if (cur.has(i)) { next.delete(i); } else { next.add(i); }
      return next;
    });
  };
  return (
    <div className="divide-y divide-line border border-gray-200 rounded-lg overflow-hidden bg-white">
      {items.map((it, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i}>
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-start justify-between gap-4 text-left px-5 py-4 hover:bg-brand-blue/5 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-brand-dark">{it.q}</span>
              <span className={`text-brand-blue text-xl leading-none transition-transform shrink-0 ${isOpen ? 'rotate-45' : ''}`}>+</span>
            </button>
            {isOpen && <div className="px-5 pb-5 text-sm text-brand-gray leading-relaxed">{it.a}</div>}
          </div>
        );
      })}
    </div>
  );
}
