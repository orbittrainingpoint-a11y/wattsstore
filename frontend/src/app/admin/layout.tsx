'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';

const NAV_GROUPS: { label: string; items: { label: string; href: string; icon: string }[] }[] = [
  {
    label: 'Insights',
    items: [
      { label: 'Dashboard', href: '/admin', icon: '⊞' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', href: '/admin/catalog/products', icon: '📦' },
      { label: 'Categories', href: '/admin/catalog/categories', icon: '🗂' },
      { label: 'Inventory', href: '/admin/inventory', icon: '📊' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Sales Console', href: '/admin/sales-dashboard', icon: '🎯' },
      { label: 'Orders', href: '/admin/orders', icon: '🧾' },
      { label: 'RFQ Queue', href: '/admin/rfq', icon: '📋' },
      { label: 'Customers', href: '/admin/customers', icon: '👥' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Content Hub', href: '/admin/content', icon: 'CMS' },
      { label: 'Media Library', href: '/admin/content/media', icon: 'IMG' },
      { label: 'Testimonials', href: '/admin/content/testimonials', icon: 'REV' },
      { label: 'Promotions', href: '/admin/promotions', icon: '🏷' },
      { label: 'Reviews', href: '/admin/reviews', icon: '⭐' },
      { label: 'Banners', href: '/admin/content/banners', icon: '🖼' },
      { label: 'Blog', href: '/admin/content/blog', icon: '✍' },
      { label: 'FAQ', href: '/admin/content/faq', icon: '❓' },
      { label: 'Legal pages', href: '/admin/content/legal', icon: '📜' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Notifications', href: '/admin/notifications', icon: '🔔' },
      { label: 'Audit Log', href: '/admin/audit', icon: '🗂' },
      { label: 'Settings', href: '/admin/settings', icon: '⚙' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();

  const allowed = user && ['admin', 'super_admin', 'sales_agent'].includes(user.role);
  useEffect(() => {
    if (!isLoading && !allowed) router.push('/auth/login');
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) {
    return (
      <div suppressHydrationWarning className="flex h-screen items-center justify-center bg-brand-light">
        <div suppressHydrationWarning className="flex items-center gap-3 text-brand-gray">
          <div suppressHydrationWarning className="h-5 w-5 rounded-full border-2 border-brand-blue border-t-transparent spin-slow" />
          <span className="text-sm">Checking access…</span>
        </div>
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="flex min-h-screen" style={{ background: 'linear-gradient(180deg,#f7f9fc 0%,#eef3fa 100%)' }}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 relative overflow-hidden text-gray-300 hidden md:block" style={{ background: 'linear-gradient(180deg,#0b1220 0%,#1a202c 100%)' }}>
        <span className="blob h-48 w-48 -top-12 -right-8 bg-brand-blue/30" />
        <div suppressHydrationWarning className="relative p-5 flex flex-col h-full">
          <Link href="/admin" className="flex items-center gap-2 text-lg font-extrabold text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-yellow to-[#ffb84d] text-brand-dark">⚡</span>
            <span>Watts<span className="text-gradient-on-dark">Admin</span></span>
          </Link>
          <div suppressHydrationWarning className="mt-1 ml-11 text-[10px] uppercase tracking-[0.18em] text-brand-yellow font-bold">Console · v1.0</div>

          <nav className="mt-7 space-y-5 flex-1 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div suppressHydrationWarning key={group.label}>
                <div suppressHydrationWarning className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.18em] text-gray-500 font-bold">{group.label}</div>
                <div suppressHydrationWarning className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${active ? 'bg-gradient-to-r from-brand-blue to-[#4cc9f0] text-white shadow-lg shadow-brand-blue/20' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                      >
                        <span className="text-base w-5 text-center">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div suppressHydrationWarning className="mt-4 glass-dark rounded-xl p-3 flex items-center gap-3">
            <div suppressHydrationWarning className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] flex items-center justify-center text-sm font-bold text-white">
              {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
            </div>
            <div suppressHydrationWarning className="flex-1 min-w-0">
              <div suppressHydrationWarning className="text-sm font-semibold text-white line-clamp-1">{user?.firstName}</div>
              <div suppressHydrationWarning className="text-[10px] uppercase tracking-wider text-brand-yellow">{user?.role}</div>
            </div>
            <button onClick={logout} title="Sign out" className="h-8 w-8 rounded-lg bg-white/5 hover:bg-status-error/30 hover:text-white text-sm">⎋</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div suppressHydrationWarning className="sticky top-0 z-30 glass border-b border-gray-200">
          <div suppressHydrationWarning className="px-4 md:px-8 py-3 flex items-center justify-between">
            <div suppressHydrationWarning>
              <div suppressHydrationWarning className="text-[10px] uppercase tracking-[0.18em] text-brand-gray font-bold">Admin Console</div>
              <div suppressHydrationWarning className="text-sm font-bold text-brand-dark">{pathname.replace('/admin', '') || 'Dashboard'}</div>
            </div>
            <div suppressHydrationWarning className="flex items-center gap-2">
              <input className="input !rounded-full max-w-xs hidden md:block" placeholder="Search admin…" />
              <Link href="/ae" className="btn-outline btn-sm">View Storefront ↗</Link>
            </div>
          </div>
        </div>
        <div suppressHydrationWarning className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
