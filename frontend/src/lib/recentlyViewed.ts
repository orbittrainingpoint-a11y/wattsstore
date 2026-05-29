/**
 * Recently-viewed product persistence — localStorage, 12 most recent.
 * SSR-safe (no window access at module-load); call from useEffect/event handlers.
 */
const KEY = 'ws:recentlyViewed';
const MAX = 12;

export interface RecentItem {
  slug: string;
  title: string;
  image?: string | null;
  productId: number;
  visitedAt: number;
}

export function readRecent(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch { return []; }
}

export function pushRecent(item: Omit<RecentItem, 'visitedAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const list = readRecent().filter((x) => x.slug !== item.slug);
    list.unshift({ ...item, visitedAt: Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch { /* ignore quota errors */ }
}

export function clearRecent(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
