'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import { useUiStore } from '@/stores/uiStore';
import { useRouteParams } from '@/lib/useRouteParams';

interface BasketItem { variantId: number; variantSku: string; productTitle: string; targetQuantity: number; customerRemarks: string }
interface Basket { items: BasketItem[] }

export default function QuoteBasketPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const setQuoteCount = useUiStore((state) => state.setQuoteCount);
  const [basket, setBasket] = useState<Basket | null>(null);
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', deliveryLocation: '', urgencyLevel: 'within_30_days', additionalNotes: '' });
  const [ref, setRef] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => { if (user) api.get<Basket>('/quote/basket', { country: region }).then((r) => { setBasket(r.data); setQuoteCount(r.data.items.length); }).catch(() => { setBasket({ items: [] }); setQuoteCount(0); }); }, [user, region, setQuoteCount]);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { data } = await api.post<{ quoteRefNumber: string }>('/quote/submit', form, { country: region });
      setRef(data.quoteRefNumber);
      setBasket({ items: [] });
      setQuoteCount(0);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function updateItem(variantId: number, targetQuantity: number) {
    if (targetQuantity < 1) return removeItem(variantId);
    const { data } = await api.put<Basket>(`/quote/basket/items/${variantId}`, { targetQuantity }, { country: region });
    setBasket(data);
    setQuoteCount(data.items.length);
  }

  async function removeItem(variantId: number) {
    const { data } = await api.del<Basket>(`/quote/basket/items/${variantId}`, { country: region });
    setBasket(data);
    setQuoteCount(data.items.length);
  }

  if (ref) {
    return (
      <div className="container-ws py-16">
        <div className="mx-auto max-w-xl">
          <div className="card p-10 text-center fade-up">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] flex items-center justify-center text-4xl text-white shadow-lg shadow-brand-blue/30 floaty">📋</div>
            <h1 className="mt-5 text-3xl font-extrabold">RFQ submitted</h1>
            <p className="mt-2 text-sm text-brand-gray">Our sales team will respond — typically same business day.</p>
            <div className="mt-5 rounded-xl border border-gray-200 p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-brand-gray font-bold">Quote Reference</div>
              <div className="mt-1 font-mono text-xl font-extrabold text-brand-blue">{ref}</div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={`/${region}/account`} className="btn-primary">View My Quotes</Link>
              <Link href={`/${region}`} className="btn-outline">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-ws py-10">
      <header className="mb-6 max-w-2xl">
        <div className="section-eyebrow">B2B Procurement</div>
        <h1 className="mt-1 text-3xl font-extrabold">Request a Quote</h1>
        <p className="mt-2 text-sm text-brand-gray">Submit a Request for Quote — receive a PDF invoice with terms within one business day.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section>
          <h2 className="text-base font-extrabold mb-3">Items in basket</h2>
          {!basket || basket.items.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="text-5xl">📋</div>
              <p className="mt-3 font-semibold">Your quote basket is empty</p>
              <p className="mt-1 text-sm text-brand-gray">Add products via &ldquo;Add to Bulk Quote&rdquo; on any product page.</p>
              <Link href={`/${region}`} className="btn-primary mt-5 inline-flex">Browse Catalog</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {basket.items.map((it) => (
                <div key={it.variantId} className="card p-4 flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-yellow/15 flex items-center justify-center text-xl shrink-0">📦</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold line-clamp-1">{it.productTitle}</p>
                    <p className="font-mono text-[11px] text-brand-gray">{it.variantSku}</p>
                    {it.customerRemarks && <p className="mt-1 text-xs text-brand-gray italic">Note: {it.customerRemarks}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center rounded-lg border border-gray-200">
                      <button type="button" className="px-2 py-1 hover:bg-gray-50" onClick={() => updateItem(it.variantId, it.targetQuantity - 1)}>-</button>
                      <span className="w-9 text-center text-sm font-bold">{it.targetQuantity}</span>
                      <button type="button" className="px-2 py-1 hover:bg-gray-50" onClick={() => updateItem(it.variantId, it.targetQuantity + 1)}>+</button>
                    </div>
                    <button type="button" className="text-[11px] font-semibold text-status-error hover:underline" onClick={() => removeItem(it.variantId)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[['💸','Volume pricing'],['📜','Original certs'],['🧾','PDF invoice']].map(([i,t]) => (
              <div key={t} className="card p-3 text-center text-xs">
                <div className="text-xl">{i}</div>
                <div className="mt-1 font-semibold">{t}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-[150px] lg:h-fit">
          <form onSubmit={submit} className="card p-6 space-y-3">
            <h2 className="text-base font-extrabold">Your details</h2>
            <p className="text-xs text-brand-gray">No payment required at this stage — we send a formal quote first.</p>
            <Field placeholder="Company name *" value={form.companyName} onChange={upd('companyName')} required />
            <Field placeholder="Contact name *" value={form.contactName} onChange={upd('contactName')} required />
            <Field type="email" placeholder="Contact email *" value={form.contactEmail} onChange={upd('contactEmail')} required />
            <Field placeholder="Contact phone" value={form.contactPhone} onChange={upd('contactPhone')} />
            <textarea className="input min-h-[80px]" placeholder="Delivery location *" value={form.deliveryLocation} onChange={upd('deliveryLocation')} required />
            <select className="input" value={form.urgencyLevel} onChange={upd('urgencyLevel')}>
              <option value="immediate">⚡ Immediate (this week)</option>
              <option value="within_30_days">📅 Within 30 days</option>
              <option value="within_60_days">📅 Within 60 days</option>
              <option value="planning_phase">📋 Planning phase</option>
            </select>
            <textarea className="input min-h-[80px]" placeholder="Additional notes (certifications, voltage, etc.)" value={form.additionalNotes} onChange={upd('additionalNotes')} />
            {err && <p className="text-sm text-status-error rounded-lg bg-status-error/10 p-2">⚠ {err}</p>}
            <button className="btn-primary btn-lg w-full" disabled={!basket?.items.length || busy}>
              {busy ? 'Submitting…' : 'Submit Quote Request →'}
            </button>
            <p className="text-[11px] text-brand-gray text-center">Submit quantities and delivery details for a formal quotation.</p>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
