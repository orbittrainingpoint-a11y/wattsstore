'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useRouteParams } from '@/lib/useRouteParams';

function Confirmation({ region }: { region: string }) {
  const order = useSearchParams().get('order');
  return (
    <div className="relative overflow-hidden">
      <span className="blob h-72 w-72 -top-10 right-1/3 bg-emerald-200" />
      <span className="blob h-72 w-72 bottom-0 left-1/3 bg-brand-yellow/40" />
      <div className="container-ws relative py-16 md:py-24">
        <div className="mx-auto max-w-xl">
          <div className="card p-8 md:p-10 text-center relative overflow-hidden fade-up">
            <span className="blob h-32 w-32 -top-6 -right-6 bg-emerald-300" />
            <div className="relative mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/30 floaty">✓</div>
            <h1 className="mt-5 text-3xl font-extrabold">Order placed</h1>
            <p className="mt-2 text-sm text-brand-gray">Your order is being processed.</p>
            <div className="mt-5 rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-brand-gray font-bold">Order Number</div>
              <div className="mt-1 font-mono text-xl font-extrabold text-brand-blue">{order}</div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
              {[['📧','Confirmation email'],['🔗','Verify address'],['🚚','We ship']].map(([i,t]) => (
                <div key={t} className="rounded-lg border border-gray-200 p-3 text-center">
                  <div className="text-xl">{i}</div>
                  <div className="mt-1 font-semibold">{t}</div>
                </div>
              ))}
            </div>

            <p className="mt-5 text-xs text-brand-gray">
              <strong>Important:</strong> check your inbox to verify the shipping address — your order won&apos;t ship until you do.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`/${region}/account/orders`} className="btn-primary">Track Your Order</Link>
              <Link href={`/${region}`} className="btn-outline">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmationPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  return (
    <Suspense fallback={<div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>}>
      <Confirmation region={region} />
    </Suspense>
  );
}
