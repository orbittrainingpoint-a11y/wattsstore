import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { BottomNav } from '@/components/layout/BottomNav';
import { OfferPopup } from '@/components/layout/OfferPopup';
import { PwaInstallBanner } from '@/components/ui/PwaInstallBanner';
import { REGIONS } from '@/lib/utils';

export function generateStaticParams() {
  return Object.keys(REGIONS).map((country) => ({ country }));
}

export default async function CountryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  if (!REGIONS[country] && !/^[a-z]{2}$/.test(country)) notFound();
  return (
    <>
      <AnnouncementBar />
      <Suspense fallback={<div className="h-[120px] border-b border-gray-100" />}>
        <Navbar region={country} />
      </Suspense>
      <main className="min-h-[60vh]">{children}</main>
      <Footer region={country} />
      <CartDrawer region={country} />
      <Suspense>
        <BottomNav region={country} />
      </Suspense>
      <OfferPopup region={country} />
      <PwaInstallBanner />
    </>
  );
}
