/** Star rating display — supports half-stars rendered via CSS clip width. */
export function RatingStars({ value, size = 'sm', showValue = false, count }: { value: number; size?: 'sm' | 'md' | 'lg'; showValue?: boolean; count?: number }) {
  const px = size === 'sm' ? 14 : size === 'md' ? 18 : 22;
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-block leading-none" style={{ fontSize: px, color: '#e5e7eb' }} aria-label={`${value.toFixed(1)} out of 5`}>
        ★★★★★
        <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-brand-yellow" style={{ width: `${pct}%` }}>
          ★★★★★
        </span>
      </span>
      {showValue && <span className="text-xs font-semibold text-brand-dark">{value.toFixed(1)}</span>}
      {count != null && <span className="text-xs text-brand-gray">({count.toLocaleString()})</span>}
    </span>
  );
}
