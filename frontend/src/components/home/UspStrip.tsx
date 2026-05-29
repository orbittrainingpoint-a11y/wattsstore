/** 4-column USP strip (trust signals). Industrial palette icons. */
export function UspStrip() {
  const items = [
    { icon: '🚚', title: 'Regional Catalog', sub: 'Availability shown per market' },
    { icon: '🏭', title: 'Product Documents', sub: 'Downloads where uploaded' },
    { icon: '💬', title: 'B2B Quotes', sub: 'Formal pricing requests' },
    { icon: '🔒', title: 'Secure Payment', sub: 'Stripe card processing · TLS 1.3' },
  ];
  return (
    <section className="border-y border-gray-200 surface-soft">
      <div className="container-ws grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200">
        {items.map((it) => (
          <div key={it.title} className="flex items-center gap-3 px-3 py-5 md:px-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-xl">{it.icon}</div>
            <div>
              <div className="text-sm font-semibold text-brand-dark">{it.title}</div>
              <div className="text-[11px] text-brand-gray">{it.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
