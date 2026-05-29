'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, REGIONS } from '@/lib/utils';
import { productImage } from '@/lib/images';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useRouteParams } from '@/lib/useRouteParams';

interface Wish { productId: number; title: string; slug: string; image: string | null; price: number | null }

export default function WishlistPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const currency = REGIONS[region]?.currency ?? 'USD';
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [list, setList] = useState<Wish[]>([]);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => { if (user) api.get<Wish[]>('/wishlist', { country: region }).then((r) => setList(r.data)).catch(() => setList([])); }, [user, region]);

  async function remove(id: number) {
    await api.del(`/wishlist/${id}`, { country: region });
    setList((l) => l.filter((w) => w.productId !== id));
  }

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'Wishlist' }]} />
      <header className="mt-4 mb-6"><div className="section-eyebrow">Account</div><h1 className="mt-1 text-3xl font-extrabold">Wishlist</h1></header>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl">♡</div>
          <p className="mt-3 font-semibold">Your wishlist is empty</p>
          <p className="mt-1 text-sm text-brand-gray">Tap the heart icon on any product to save it for later.</p>
          <Link href={`/${region}`} className="btn-primary mt-5 inline-flex">Browse catalog</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((w) => (
            <div key={w.productId} className="card p-3 flex flex-col">
              <Link href={`/${region}/products/${w.slug}`} className="block aspect-product rounded-lg overflow-hidden bg-brand-light">
                <img src={productImage({ url: w.image, productId: w.productId })} alt={w.title} className="h-full w-full object-cover" />
              </Link>
              <Link href={`/${region}/products/${w.slug}`} className="mt-3 line-clamp-2 text-sm font-semibold hover:text-brand-blue">{w.title}</Link>
              {w.price != null && <div className="mt-1 font-mono font-bold text-brand-blue">{formatCurrency(w.price, currency)}</div>}
              <div className="mt-3 flex gap-2">
                <Link href={`/${region}/products/${w.slug}`} className="btn-primary btn-sm flex-1">View</Link>
                <button onClick={() => remove(w.productId)} className="btn-outline btn-sm">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
