'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUiStore } from '@/stores/uiStore';
import { useGeoStore } from '@/stores/geoStore';
import { useAuth } from '@/lib/useAuth';
import { useCart } from '@/lib/useCart';
import { REGIONS } from '@/lib/utils';
import { api } from '@/lib/api';
import { productImage } from '@/lib/images';

interface MenuCategory {
  name: string;
  slug: string;
  description?: string | null;
  variantSpecificationSchema?: MenuField[] | null;
  children?: MenuCategory[];
  showInMenu?: boolean;
}

interface MenuField {
  field: string;
  label: string;
  options?: string[];
  filterEnabled?: boolean;
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
];

export function Navbar({ region }: { region: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { refresh } = useCart(region);
  const cartCount = useUiStore((s) => s.cartCount);
  const quoteCount = useUiStore((s) => s.quoteCount);
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  const setQuoteCount = useUiStore((s) => s.setQuoteCount);
  const setRegion = useGeoStore((s) => s.setRegion);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ title: string; slug: string; category: string; image: string | null }[]>([]);
  const [sugOpen, setSugOpen] = useState(false);

  // Debounced autocomplete
  useEffect(() => {
    if (!q.trim() || q.trim().length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get<{ title: string; slug: string; category: string; image: string | null }[]>(`/catalog/search/autocomplete?q=${encodeURIComponent(q.trim())}`, { country: region })
        .then((r) => setSuggestions(r.data))
        .catch(() => setSuggestions([]));
    }, 280);
    return () => clearTimeout(t);
  }, [q, region]);

  useEffect(() => {
    const r = REGIONS[region];
    setRegion(region, r?.code ?? region.toUpperCase(), r?.currency ?? 'USD');
    if (user) {
      void refresh();
      api.get<{ items: { variantId: number }[] }>('/quote/basket', { country: region })
        .then((res) => setQuoteCount(res.data.items?.length ?? 0))
        .catch(() => setQuoteCount(0));
    } else {
      setQuoteCount(0);
    }
  }, [region, user, setRegion, refresh, setQuoteCount]);

  useEffect(() => {
    api.get<MenuCategory[]>('/catalog/categories', { country: region })
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, [region]);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem('wattsstore-language') || navigator.language?.slice(0, 2) || 'en';
    setLanguage(LANGUAGES.some((item) => item.code === storedLanguage) ? storedLanguage : 'en');
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    window.localStorage.setItem('wattsstore-language', language);
  }, [language]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/${region}/search?q=${encodeURIComponent(q.trim())}`);
  }

  const menuCategories = categories.filter((category) => category.showInMenu !== false);

  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'glass shadow-[0_8px_30px_rgba(15,23,42,0.06)]' : 'bg-white border-b border-gray-100'}`}>
      {/* Primary row */}
      <div className="container-ws flex items-center gap-4 py-3">
        <Link href={`/${region}`} className="text-xl font-extrabold tracking-tight shrink-0 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white shadow-sm">⚡</span>
          <span><span className="text-gradient">Watts</span><span className="text-brand-dark">Store</span></span>
        </Link>

        <form onSubmit={(e) => { onSearch(e); setSugOpen(false); }} className="hidden md:block flex-1 max-w-2xl">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray text-sm">🔍</span>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setSugOpen(true); }}
              onFocus={() => setSugOpen(true)}
              onBlur={() => setTimeout(() => setSugOpen(false), 180)}
              placeholder="Search products, brands and certifications..."
              className="input !pl-9 !rounded-full"
              aria-label="Search"
            />
            <kbd className="hidden sm:inline absolute right-2 top-1/2 -translate-y-1/2 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-brand-gray">⌘K</kbd>

            {sugOpen && suggestions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 card overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {suggestions.map((s, i) => (
                    <li key={i}>
                      <Link href={`/${region}/products/${s.slug}`} className="flex items-center gap-3 p-3 hover:bg-brand-blue/5">
                        <div className="h-10 w-10 rounded-md overflow-hidden bg-brand-light shrink-0">
                          <img src={s.image ?? productImage({ productId: i })} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold line-clamp-1">{s.title}</div>
                          <div className="text-xs text-brand-gray">{s.category}</div>
                        </div>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={`/${region}/search?q=${encodeURIComponent(q)}`} className="block px-3 py-2.5 text-sm text-brand-blue font-semibold hover:bg-brand-blue/5">
                      See all results for &ldquo;{q}&rdquo; →
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </form>

        <div className="flex items-center gap-1 md:gap-2 text-sm shrink-0">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="md:hidden h-9 w-9 rounded-lg hover:bg-brand-blue/5 flex items-center justify-center">☰</button>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="hidden lg:block rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium focus:border-brand-blue focus:outline-none"
            aria-label="Language"
          >
            {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>

          <Link href={`/${region}/quote-basket`} className="relative h-9 w-9 rounded-lg hover:bg-brand-blue/5 flex items-center justify-center" aria-label="Quote basket">
            <span>📋</span>
            {quoteCount > 0 && <Badge color="bg-status-warning">{quoteCount}</Badge>}
          </Link>

          <button onClick={() => setCartOpen(true)} className="relative h-9 w-9 rounded-lg hover:bg-brand-blue/5 flex items-center justify-center" aria-label="Cart">
            <span>🛒</span>
            {cartCount > 0 && <Badge color="bg-brand-blue">{cartCount}</Badge>}
          </button>

          <Link
            href={user ? `/${region}/account` : '/auth/login'}
            className="hidden sm:inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 hover:border-brand-blue hover:text-brand-blue transition"
          >
            <span className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white text-xs font-bold inline-flex items-center justify-center">
              {user ? user.firstName.charAt(0) : '👤'}
            </span>
            <span className="text-sm font-medium">{user ? user.firstName : 'Sign in'}</span>
          </Link>
        </div>
      </div>

      {/* Category strip — desktop only; mobile uses the slide-in hamburger menu */}
      <nav className="relative border-t border-gray-100 hidden md:block" onMouseLeave={() => setOpenCategory(null)}>
        <div className="container-ws flex gap-1 md:gap-2 overflow-x-auto no-scrollbar py-2 text-sm">
          {menuCategories.slice(0, 7).map((category) => {
            const active = pathname.includes(`/categories/${category.slug}`);
            const open = openCategory === category.slug;
            const hasChildren = hasMenuChildren(category);
            return (
              <div
                key={category.slug}
                className={`flex items-center rounded-full transition ${active ? 'bg-brand-blue text-white shadow-sm' : 'text-brand-gray hover:bg-brand-blue/5 hover:text-brand-blue'}`}
                onMouseEnter={() => setOpenCategory(hasChildren ? category.slug : null)}
              >
                <Link href={`/${region}/categories/${category.slug}`} className={`whitespace-nowrap py-1.5 font-medium ${hasChildren ? 'pl-3 pr-1' : 'px-3'}`}>
                  {category.name}
                </Link>
                {hasChildren && (
                  <button
                    type="button"
                    className="px-2 py-1.5 text-[10px] leading-none"
                    aria-label={`Open ${category.name} menu`}
                    aria-expanded={open}
                    onFocus={() => setOpenCategory(category.slug)}
                    onClick={() => setOpenCategory(open ? null : category.slug)}
                  >
                    <span className={`inline-block transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                )}
              </div>
            );
          })}
          <span className="ml-auto hidden md:flex items-center gap-3 text-xs text-brand-gray pr-2">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-yellow" />Live regional pricing</span>
            <span>·</span>
            <Link href={`/${region}/track-order`} className="link-underline hover:text-brand-blue">Track Order</Link>
          </span>
        </div>
        {openCategory && menuCategories.find((category) => category.slug === openCategory && hasMenuChildren(category)) && (
          <div className="absolute left-0 right-0 top-full hidden border-t border-gray-100 bg-white shadow-xl md:block">
            <CategoryDropdown category={menuCategories.find((category) => category.slug === openCategory)!} region={region} close={() => setOpenCategory(null)} />
          </div>
        )}
      </nav>

      {/* Mobile slide-in menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <Link href={`/${region}`} onClick={() => setMobileOpen(false)} className="text-lg font-extrabold flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue to-[#4cc9f0] text-white">⚡</span>
                <span><span className="text-gradient">Watts</span>Store</span>
              </Link>
              <button onClick={() => setMobileOpen(false)} className="text-2xl">×</button>
            </div>
            <form onSubmit={(e) => { onSearch(e); setMobileOpen(false); }} className="mb-4">
              <input className="input !rounded-full" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input mb-4" aria-label="Language">
              {LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <nav className="space-y-1">
              {menuCategories.map((category) => (
                <div key={category.slug} className="rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <Link href={`/${region}/categories/${category.slug}`} onClick={() => setMobileOpen(false)} className="block flex-1 px-3 py-2.5 font-medium hover:bg-brand-blue/5">
                      {category.name}
                    </Link>
                    {hasMenuChildren(category) && (
                      <button type="button" className="px-3 py-2.5 text-xs" onClick={() => setOpenCategory(openCategory === category.slug ? null : category.slug)} aria-label={`Toggle ${category.name} menu`}>
                        <span className={`inline-block transition-transform ${openCategory === category.slug ? 'rotate-180' : ''}`}>▼</span>
                      </button>
                    )}
                  </div>
                  {hasMenuChildren(category) && openCategory === category.slug && (
                    <div className="border-t border-gray-100 px-3 pb-3 pt-2">
                      {filterLinks(category, region).map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={`block py-1.5 hover:text-brand-blue ${link.indent === 0 ? 'text-sm font-semibold text-brand-dark' : 'text-sm text-brand-gray'}`}
                          style={{ paddingLeft: `${link.indent * 12}px` }}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}

function filterLinks(category: MenuCategory, region: string) {
  return descendants(category).map(({ node, depth }) => ({
    label: node.name,
    indent: depth - 1, // used for visual left-padding only
    href: `/${region}/categories/${node.slug}`,
  }));
}

function hasMenuChildren(category: MenuCategory) {
  return (category.children ?? []).some((child) => child.showInMenu !== false);
}

function CategoryDropdown({ category, region, close }: { category: MenuCategory; region: string; close: () => void }) {
  const directChildren = (category.children ?? []).filter((c) => c.showInMenu !== false);
  return (
    <div className="container-ws grid grid-cols-[220px_1fr] gap-8 py-5">
      {/* Left panel — overview */}
      <div>
        <div className="text-lg font-extrabold text-brand-dark">{category.name}</div>
        {category.description && <p className="mt-2 text-sm leading-relaxed text-brand-gray">{category.description}</p>}
        <Link href={`/${region}/categories/${category.slug}`} onClick={close} className="btn-primary btn-sm mt-4 inline-flex">
          Browse all
        </Link>
      </div>
      {/* Right panel — subcategories grouped by parent; each depth-1 child is its own column */}
      {directChildren.length > 0 && (
        <div className="grid gap-x-6 gap-y-1" style={{ gridTemplateColumns: `repeat(${Math.min(directChildren.length, 4)}, minmax(0,1fr))` }}>
          {directChildren.map((child) => {
            const grandchildren = (child.children ?? []).filter((c) => c.showInMenu !== false);
            return (
              <div key={child.slug} className="flex flex-col gap-0.5">
                {/* Depth-1: bold header link */}
                <Link
                  href={`/${region}/categories/${child.slug}`}
                  onClick={close}
                  className="text-sm font-bold text-brand-dark hover:text-brand-blue transition py-1"
                >
                  {child.name}
                </Link>
                {/* Depth-2: plain sub-links, same list, no extra indentation */}
                {grandchildren.map((gc) => (
                  <Link
                    key={gc.slug}
                    href={`/${region}/categories/${gc.slug}`}
                    onClick={close}
                    className="text-xs text-brand-gray hover:text-brand-blue transition py-0.5 pl-0"
                  >
                    {gc.name}
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function descendants(category: MenuCategory) {
  const result: { node: MenuCategory; depth: number }[] = [];
  const visit = (nodes: MenuCategory[], depth: number) => {
    for (const node of nodes) {
      result.push({ node, depth });
      visit((node.children ?? []).filter((child) => child.showInMenu !== false), depth + 1);
    }
  };
  visit((category.children ?? []).filter((node) => node.showInMenu !== false), 1);
  return result;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`absolute -right-1 -top-1 ${color} text-white text-[10px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold shadow-sm`}>
      {children}
    </span>
  );
}
