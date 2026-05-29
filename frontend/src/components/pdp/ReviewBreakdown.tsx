import { RatingStars } from '@/components/ui/RatingStars';

/** Rating histogram (1–5) + average. Pure presentational. */
export function ReviewBreakdown({
  average,
  total,
  breakdown,
}: {
  average: number;
  total: number;
  breakdown: { stars: 1 | 2 | 3 | 4 | 5; count: number }[];
}) {
  const max = Math.max(1, ...breakdown.map((b) => b.count));
  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-6 items-center">
      <div className="text-center">
        <div className="text-5xl font-extrabold text-brand-blue">{average.toFixed(1)}</div>
        <RatingStars value={average} size="md" />
        <div className="mt-1 text-xs text-brand-gray">{total.toLocaleString()} verified reviews</div>
      </div>
      <div className="space-y-1.5">
        {([5, 4, 3, 2, 1] as const).map((star) => {
          const c = breakdown.find((b) => b.stars === star)?.count ?? 0;
          const pct = (c / max) * 100;
          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="w-8 font-semibold">{star}★</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-brand-yellow rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 text-right text-brand-gray">{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
