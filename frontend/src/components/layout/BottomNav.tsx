'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/stores/uiStore';
import { useAuth } from '@/lib/useAuth';

/**
 * Mobile-only bottom navigation bar — app-style. Hidden on md+.
 * Five tabs: Home · Catalog · Search · Cart · Account. Cart & Quote show count badges.
 * Fixed to bottom with iOS safe-area padding via env(safe-area-inset-bottom).
 */
export function BottomNav({ region }: { region: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const cartCount = useUiStore((s) => s.cartCount);
  const quoteCount = useUiStore((s) => s.quoteCount);
  const setCartOpen = useUiStore((s) => s.setCartOpen);

  const tabs = [
    { key: 'home',    label: 'Home',    href: `/${region}`,                                icon: HomeIcon, match: (p: string) => p === `/${region}` },
    { key: 'catalog', label: 'Shop',    href: `/${region}/categories/industrial-lighting`, icon: GridIcon, match: (p: string) => p.includes('/categories/') || p.includes('/products/') || p.includes('/brands') },
    { key: 'search',  label: 'Search',  href: `/${region}/search`,                         icon: SearchIcon, match: (p: string) => p.includes('/search') },
    { key: 'cart',    label: 'Cart',    href: `/${region}/cart`,                           icon: CartIcon, match: (p: string) => p.includes('/cart') || p.includes('/checkout'), badge: cartCount, action: () => setCartOpen(true) },
    { key: 'account', label: user ? 'Account' : 'Sign in', href: user ? `/${region}/account` : '/auth/login', icon: UserIcon, match: (p: string) => p.includes('/account') || p.startsWith('/auth') },
  ];

  // Hide on admin or auth pages
  if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) return null;

  return (
    <>
      {/* Spacer so content can scroll above the nav */}
      <div className="md:hidden h-[calc(64px+env(safe-area-inset-bottom))]" aria-hidden />

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-gray-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Primary mobile navigation"
      >
        <div className="grid grid-cols-5 h-16">
          {tabs.map((t) => {
            const active = t.match(pathname);
            const Icon = t.icon;
            const inner = (
              <span className={`relative flex flex-col items-center justify-center gap-0.5 h-full ${active ? 'text-brand-blue' : 'text-brand-gray'}`}>
                {active && <span className="absolute top-0 inset-x-3 h-0.5 bg-brand-blue rounded-full" />}
                <span className="relative">
                  <Icon active={active} />
                  {t.badge ? (
                    <span className="absolute -top-1.5 -right-2 bg-brand-blue text-white text-[10px] rounded-full h-4 min-w-4 px-1 font-bold flex items-center justify-center shadow-sm">
                      {t.badge > 99 ? '99+' : t.badge}
                    </span>
                  ) : null}
                </span>
                <span className={`text-[11px] font-semibold tracking-tight ${active ? 'text-brand-blue' : 'text-brand-gray'}`}>{t.label}</span>
              </span>
            );
            return (
              <Link key={t.key} href={t.href} className="touch-manipulation tap-highlight-transparent">
                {inner}
              </Link>
            );
          })}
        </div>

        {/* Floating Quote badge — extra layer above the cart tab when count > 0 */}
        {quoteCount > 0 && (
          <Link
            href={`/${region}/quote-basket`}
            className="absolute -top-5 left-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-gradient-to-br from-brand-yellow to-[#ffb84d] text-brand-dark flex items-center justify-center shadow-lg shadow-brand-yellow/30 border-2 border-white"
            aria-label={`Quote basket — ${quoteCount} items`}
          >
            <ClipboardIcon active />
            <span className="absolute -top-1 -right-1 bg-status-error text-white text-[10px] rounded-full h-4 min-w-4 px-1 font-bold flex items-center justify-center">{quoteCount}</span>
          </Link>
        )}
      </nav>
    </>
  );
}

/* — Inline SVG icons (no emoji) — minimal stroke set, brand-aware via currentColor — */

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V11z" />
    </svg>
  );
}
function GridIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
    </svg>
  );
}
function CartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="20" r="1.6"/>
      <circle cx="18" cy="20" r="1.6"/>
      <path d="M3 4h2l2.5 12h12L22 7H6.2"/>
    </svg>
  );
}
function UserIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="4"/>
      <path d="M3 21c0-4.5 4-7 9-7s9 2.5 9 7"/>
    </svg>
  );
}
function ClipboardIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="6" y="4" width="12" height="17" rx="2"/>
      <rect x="9" y="2" width="6" height="4" rx="1"/>
      <path d="M9 11h6M9 15h4"/>
    </svg>
  );
}
