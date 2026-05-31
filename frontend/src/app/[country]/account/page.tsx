'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { ACCOUNT_ICONS } from '@/lib/images';
import { DynamicPromoBanner } from '@/components/ui/DynamicPromoBanner';
import { useRouteParams } from '@/lib/useRouteParams';
import { api } from '@/lib/api';

export default function AccountDashboard({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    api.get<{ count: number }>('/account/notifications/unread-count')
      .then((r) => setUnreadCount(r.data.count))
      .catch(() => undefined);
  }, [user]);

  if (isLoading || !user) return <div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>;

  const tiles = [
    { t: 'My Orders', href: `/${region}/account/orders`,    icon: ACCOUNT_ICONS.orders,    sub: 'Track and view past orders', badge: 0 },
    { t: 'My Quotes', href: `/${region}/account/quotes`,    icon: ACCOUNT_ICONS.quotes,    sub: 'B2B RFQ history & offers', badge: unreadCount },
    { t: 'Addresses', href: `/${region}/account/addresses`, icon: ACCOUNT_ICONS.addresses, sub: 'Manage shipping locations', badge: 0 },
    { t: 'Wishlist',  href: `/${region}/account/wishlist`,  icon: ACCOUNT_ICONS.wishlist,  sub: 'Saved for later', badge: 0 },
    { t: 'Profile',   href: `/${region}/account/profile`,   icon: ACCOUNT_ICONS.profile,   sub: 'Name, phone, email', badge: 0 },
    { t: 'Security',  href: `/${region}/account/profile`,   icon: ACCOUNT_ICONS.security,  sub: 'Password & sessions', badge: 0 },
  ];

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="container-ws py-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl text-white p-7 md:p-10" style={{ background: 'linear-gradient(135deg,#0b1f3d 0%,#1e4d8c 100%)' }}>
        <span className="blob h-72 w-72 -top-10 -right-10 bg-brand-yellow" />
        <span className="blob h-72 w-72 bottom-0 -left-10 bg-[#4cc9f0]" />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-yellow to-[#ffb84d] flex items-center justify-center text-3xl font-extrabold text-brand-dark shadow-lg">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="section-eyebrow text-brand-yellow">Welcome back</div>
            <h1 className="mt-1 !text-white text-2xl md:text-4xl font-extrabold">{user.firstName} {user.lastName}</h1>
            <div className="mt-1 text-xs text-white/70">{user.email} {user.isEmailVerified ? '· ✓ verified' : '· ⚠ verify email'}</div>
            {isAdmin && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-yellow text-brand-dark px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <span>⚡</span>Admin · {user.role}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <Link href="/admin" className="btn-yellow">Open Admin Portal</Link>}
            {user.role === 'sales_agent' && <Link href="/admin/rfq" className="btn-yellow">Open Sales Portal</Link>}
            <button onClick={logout} className="btn-glass">Sign out</button>
          </div>
        </div>
      </section>

      {/* KPI strip */}
      <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Active orders', v: '0',    icon: ACCOUNT_ICONS.orders },
          { l: 'Open quotes',   v: '0',    icon: ACCOUNT_ICONS.quotes },
          { l: 'Wishlist',      v: '0',    icon: ACCOUNT_ICONS.wishlist },
          { l: 'Member since',  v: '2026', icon: ACCOUNT_ICONS.profile },
        ].map((s) => (
          <div key={s.l} className="card p-4 flex items-center gap-3">
            <img src={s.icon} alt="" className="h-10 w-10" />
            <div>
              <div className="text-xs text-brand-gray font-medium">{s.l}</div>
              <div className="text-xl font-extrabold">{s.v}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Account tiles */}
      <section className="mt-8">
        <h2 className="section-title mb-5">Your account</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiles.map((t) => (
            <Link key={t.t} href={t.href} className="card card-hover p-5 group flex items-start gap-3 relative">
              <img src={t.icon} alt="" className="h-11 w-11 shrink-0" />
              <div>
                <div className="font-bold group-hover:text-brand-blue flex items-center gap-2">
                  {t.t}
                  {t.badge > 0 && (
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-status-error px-1.5 text-[11px] font-bold text-white">
                      {t.badge > 99 ? '99+' : t.badge}
                    </span>
                  )}
                </div>
                <div className="text-xs text-brand-gray mt-0.5">{t.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Promo */}
      <section className="mt-10 grid md:grid-cols-2 gap-4">
        <DynamicPromoBanner
          region={region}
          placement="promo"
          big
          fallback={{ eyebrow: 'B2B', title: 'Need bulk pricing?', cta: 'Submit RFQ', href: `/${region}/quote-basket`, image: '/img/banners/cms/b2b-hero.jpg', tone: 'blue' }}
        />
        <DynamicPromoBanner
          region={region}
          placement="promo"
          index={1}
          big
          fallback={{ eyebrow: 'Limited', title: 'Solar deals / Save up to 18%', cta: 'Shop solar', href: `/${region}/categories/solar-equipment`, image: '/img/banners/cms/solar-hero.jpg', tone: 'mint' }}
        />
      </section>
    </div>
  );
}
