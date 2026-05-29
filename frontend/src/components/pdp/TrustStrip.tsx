/** Trust strip shown directly below the buy box on the PDP. Six compact signals. */
export function TrustStrip() {
  const items = [
    { i: '🛡️', t: 'Money-back Guarantee' },
    { i: '✅', t: 'Genuine Product' },
    { i: '↩️', t: 'Easy Returns (7 days)' },
    { i: '🧾', t: 'GST / VAT Invoice' },
    { i: '🔒', t: 'Secure Payments' },
    { i: '📞', t: '365-day Help Desk' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
      {items.map((it) => (
        <div key={it.t} className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2 text-xs">
          <span className="text-base">{it.i}</span>
          <span className="font-medium text-brand-dark">{it.t}</span>
        </div>
      ))}
    </div>
  );
}
