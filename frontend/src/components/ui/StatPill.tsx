/** Compact visual stat pill — used to replace text blocks with at-a-glance metrics. */
export function StatPill({ value, label, accent }: { value: string; label: string; accent?: 'blue' | 'yellow' | 'mint' }) {
  const ringColor =
    accent === 'yellow' ? 'ring-brand-yellow/40 from-brand-yellow/10' :
    accent === 'mint'   ? 'ring-emerald-300/40 from-emerald-50' :
    'ring-brand-blue/20 from-brand-blue/5';
  return (
    <div className={`relative rounded-2xl border border-gray-200 bg-gradient-to-br ${ringColor} to-white px-4 py-5 ring-1 ${ringColor.split(' ')[0]}`}>
      <div className="text-2xl md:text-3xl font-extrabold tracking-tight text-brand-dark">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-brand-gray font-semibold">{label}</div>
    </div>
  );
}
