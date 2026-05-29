/** Animated skeleton placeholder. Use as a low-CLS loading state. */
export function Skeleton({ className = '', rounded = true }: { className?: string; rounded?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-100 ${rounded ? 'rounded-lg' : ''} ${className}`}
      aria-hidden
    >
      <span className="absolute inset-0 shimmer" />
    </div>
  );
}

/** Skeleton matching a ProductCard footprint. */
export function ProductCardSkeleton() {
  return (
    <div className="card p-3">
      <Skeleton className="aspect-product mb-3" />
      <Skeleton className="h-3 w-1/3 mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-3/5 mb-3" />
      <Skeleton className="h-8" />
    </div>
  );
}

/** Skeleton matching a row in an admin / orders table. */
export function RowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="card p-4 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
      {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-4" />)}
    </div>
  );
}
