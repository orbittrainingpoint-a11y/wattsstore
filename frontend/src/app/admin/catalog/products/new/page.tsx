'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Category { id: number; name: string; depth?: number; isActive?: boolean }
interface Brand { id: number; name: string }

export default function NewProduct() {
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState({
    categoryId: 0, brandId: 0, skuBase: '', title: '', shortDescription: '', fullDescription: '',
    keyFeatures: [''],
    brandOrigin: 'Indian', isFeatured: false, isNewArrival: false,
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<Category[]>('/admin/categories').then((r) => setCats(r.data)).catch(() => undefined);
    api.get<Brand[]>('/admin/brands').then((r) => setBrands(r.data)).catch(() => undefined);
  }, []);

  async function onCategoryChange(categoryId: number) {
    setForm((current) => ({ ...current, categoryId }));
    if (!categoryId) return;
    const nextSku = await api.get<{ skuBase: string }>(`/admin/products/sku/next?categoryId=${categoryId}`).then((r) => r.data.skuBase).catch(() => '');
    if (nextSku) setForm((current) => ({ ...current, skuBase: current.skuBase || nextSku }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { data } = await api.post<{ id: number }>('/admin/products', {
        ...form,
        brandId: form.brandId || undefined,
        keyFeatures: form.keyFeatures.map((feature) => feature.trim()).filter(Boolean),
      });
      router.push(`/admin/catalog/products/${data.id}/edit`);
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div><div className="section-eyebrow">Catalog</div><h1 className="mt-1 text-3xl font-extrabold">New product</h1></div>
        <Link href="/admin/catalog/products" className="btn-outline">← All products</Link>
      </header>

      <form onSubmit={save} className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="card p-6 space-y-3">
          <Field label="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="SKU base *" value={form.skuBase} onChange={(e) => setForm({ ...form, skuBase: e.target.value })} required />
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Category *</span>
              <select required className="input mt-1.5" value={form.categoryId} onChange={(e) => void onCategoryChange(Number(e.target.value))}>
                <option value={0}>— select —</option>
                {cats.filter((c) => c.isActive !== false).map((c) => <option key={c.id} value={c.id}>{`${'-- '.repeat(Math.max(0, (c.depth ?? 1) - 1))}${c.name}`}</option>)}
              </select>
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Brand</span>
              <select className="input mt-1.5" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: Number(e.target.value) })}>
                <option value={0}>— none —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Origin</span>
              <select className="input mt-1.5" value={form.brandOrigin} onChange={(e) => setForm({ ...form, brandOrigin: e.target.value })}>
                {['Indian','Chinese','German'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
          </div>
          <label className="block"><span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Short description</span><textarea className="input mt-1.5 min-h-[60px]" value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Full description</span><textarea className="input mt-1.5 min-h-[120px]" value={form.fullDescription} onChange={(e) => setForm({ ...form, fullDescription: e.target.value })} /></label>
          <div className="space-y-2">
            <div>
              <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Key features</span>
              <p className="mt-1 text-xs text-brand-gray">Add each feature as a separate product bullet point.</p>
            </div>
            {form.keyFeatures.map((feature, index) => (
              <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  className="input"
                  value={feature}
                  placeholder={`Feature ${index + 1}`}
                  onChange={(e) => {
                    const next = [...form.keyFeatures];
                    next[index] = e.target.value;
                    setForm({ ...form, keyFeatures: next });
                  }}
                />
                <button type="button" className="btn-ghost text-status-error" onClick={() => {
                  const next = form.keyFeatures.filter((_, i) => i !== index);
                  setForm({ ...form, keyFeatures: next.length ? next : [''] });
                }}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn-outline btn-sm" onClick={() => setForm({ ...form, keyFeatures: [...form.keyFeatures, ''] })}>+ Add feature point</button>
          </div>
          {err && <p className="rounded-lg bg-status-error/10 text-status-error text-sm p-2.5">⚠ {err}</p>}
        </div>

        <aside className="space-y-3">
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Flags</h3>
            <label className="flex items-center gap-2 text-sm py-1.5"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm py-1.5"><input type="checkbox" checked={form.isNewArrival} onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })} /> New arrival</label>
          </div>
          <button className="btn-primary w-full btn-lg" disabled={busy}>{busy ? 'Creating…' : 'Create product →'}</button>
          <p className="text-[11px] text-brand-gray text-center">You'll add variants, pricing and images on the next screen.</p>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block"><span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{label}</span><input className="input mt-1.5" {...props} /></label>;
}
