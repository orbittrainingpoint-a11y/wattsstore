'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { ImagePicker } from '@/components/admin/ImagePicker';

interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  bannerImageUrl: string | null;
  originCountry: string | null;
  description: string | null;
  websiteUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  _count?: { products: number };
}

interface BrandForm {
  id?: number;
  name: string;
  slug: string;
  logoUrl: string;
  bannerImageUrl: string;
  originCountry: string;
  description: string;
  websiteUrl: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

const emptyForm = (): BrandForm => ({
  name: '',
  slug: '',
  logoUrl: '',
  bannerImageUrl: '',
  originCountry: '',
  description: '',
  websiteUrl: '',
  metaTitle: '',
  metaDescription: '',
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
});

export default function AdminBrands() {
  const [rows, setRows] = useState<Brand[]>([]);
  const [editor, setEditor] = useState<BrandForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [search, setSearch] = useState('');

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    api.get<Brand[]>(`/admin/brands?${params.toString()}`)
      .then((response) => setRows(response.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q));
  }, [rows, search]);

  function edit(row: Brand) {
    setEditor({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl ?? '',
      bannerImageUrl: row.bannerImageUrl ?? '',
      originCountry: row.originCountry ?? '',
      description: row.description ?? '',
      websiteUrl: row.websiteUrl ?? '',
      metaTitle: row.metaTitle ?? '',
      metaDescription: row.metaDescription ?? '',
      isActive: row.isActive,
      isFeatured: row.isFeatured,
      sortOrder: row.sortOrder,
    });
  }

  async function save() {
    if (!editor?.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: editor.name.trim(),
        slug: editor.slug.trim() || undefined,
        logoUrl: editor.logoUrl.trim() || null,
        bannerImageUrl: editor.bannerImageUrl.trim() || null,
        originCountry: editor.originCountry.trim() || null,
        description: editor.description.trim() || null,
        websiteUrl: editor.websiteUrl.trim() || null,
        metaTitle: editor.metaTitle.trim() || null,
        metaDescription: editor.metaDescription.trim() || null,
        isActive: editor.isActive,
        isFeatured: editor.isFeatured,
        sortOrder: editor.sortOrder,
      };
      if (editor.id) {
        await api.put(`/admin/brands/${editor.id}`, payload);
        setMessage('Brand updated.');
      } else {
        await api.post('/admin/brands', payload);
        setMessage('Brand created.');
      }
      setEditor(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function archive(row: Brand) {
    if (!confirm(`Archive "${row.name}"? Its products will keep the link but the brand is hidden from the storefront.`)) return;
    try {
      await api.del(`/admin/brands/${row.id}`);
      setMessage('Brand archived.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function restore(row: Brand) {
    try {
      await api.put(`/admin/brands/${row.id}/restore`);
      setMessage('Brand restored.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Catalog</div>
          <h1 className="mt-1 text-3xl font-extrabold">Brands</h1>
          <p className="text-sm text-brand-gray">Manage brand identity, logos and origin. Brands here appear in the product form, brand pages and filters.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Search brands..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="input w-36" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setTimeout(load, 0); }}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn-outline" onClick={load}>Apply</button>
          <button className="btn-primary" onClick={() => setEditor(emptyForm())}>+ Add brand</button>
        </div>
      </header>

      {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray">
            <tr>
              <th className="p-4">Brand</th>
              <th className="p-4">Origin</th>
              <th className="p-4 text-right">Products</th>
              <th className="p-4">Featured</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-10 text-center text-brand-gray" colSpan={6}>Loading brands...</td></tr>}
            {!loading && visible.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {row.logoUrl
                      ? <img src={row.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain bg-brand-light" />
                      : <span className="h-10 w-10 rounded-lg bg-brand-light inline-flex items-center justify-center text-xs font-bold text-brand-gray">{row.name.charAt(0).toUpperCase()}</span>}
                    <div>
                      <div className="font-semibold">{row.name}</div>
                      <div className="font-mono text-[11px] text-brand-gray">{row.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">{row.originCountry ?? <span className="text-brand-gray">—</span>}</td>
                <td className="p-4 text-right font-mono">{row._count?.products ?? 0}</td>
                <td className="p-4">{row.isFeatured ? <span className="badge-yellow">Featured</span> : <span className="text-brand-gray">—</span>}</td>
                <td className="p-4"><span className={`badge ${row.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{row.isActive ? 'Active' : 'Archived'}</span></td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="btn-outline btn-sm" onClick={() => edit(row)}>Edit</button>
                    {row.isActive
                      ? <button className="btn-ghost btn-sm text-status-error" onClick={() => void archive(row)}>Archive</button>
                      : <button className="btn-ghost btn-sm text-status-success" onClick={() => void restore(row)}>Restore</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && visible.length === 0 && <tr><td className="p-10 text-center text-brand-gray" colSpan={6}>No brands yet. Add the first one to make it available in the product form.</td></tr>}
          </tbody>
        </table>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card max-h-[92vh] w-full max-w-3xl overflow-auto p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{editor.id ? 'Edit brand' : 'Add brand'}</h2>
              <button className="text-2xl text-brand-gray" onClick={() => setEditor(null)} aria-label="Close">x</button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name *" value={editor.name} onChange={(value) => setEditor({ ...editor, name: value })} />
              <Field label="Slug (auto if empty)" value={editor.slug} onChange={(value) => setEditor({ ...editor, slug: value })} />
              <Field label="Origin country" value={editor.originCountry} placeholder="India, China, Germany..." onChange={(value) => setEditor({ ...editor, originCountry: value })} />
              <Field label="Website URL" value={editor.websiteUrl} onChange={(value) => setEditor({ ...editor, websiteUrl: value })} />
              <div className="md:col-span-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Description</span>
                  <textarea className="input mt-1.5 min-h-[90px]" value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} />
                </label>
              </div>
              <div className="md:col-span-2">
                <Field label="Logo URL" value={editor.logoUrl} placeholder="/img/brands/example-logo.png" onChange={(value) => setEditor({ ...editor, logoUrl: value })} />
                <div className="mt-2">
                  <ImagePicker folder="brands" value={editor.logoUrl || null} onSelect={(url) => setEditor({ ...editor, logoUrl: url })} label="Upload / pick logo" />
                </div>
              </div>
              <div className="md:col-span-2">
                <Field label="Banner image URL" value={editor.bannerImageUrl} placeholder="/img/brands/example-banner.jpg" onChange={(value) => setEditor({ ...editor, bannerImageUrl: value })} />
                <div className="mt-2">
                  <ImagePicker folder="brands" value={editor.bannerImageUrl || null} onSelect={(url) => setEditor({ ...editor, bannerImageUrl: url })} label="Upload / pick banner" />
                </div>
              </div>
              <Field label="Meta title" value={editor.metaTitle} onChange={(value) => setEditor({ ...editor, metaTitle: value })} />
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Sort order</span>
                <input type="number" className="input mt-1.5" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} />
              </label>
              <div className="md:col-span-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Meta description</span>
                  <textarea className="input mt-1.5 min-h-[60px]" value={editor.metaDescription} onChange={(event) => setEditor({ ...editor, metaDescription: event.target.value })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={editor.isActive} onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })} />
                Active (visible on storefront)
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={editor.isFeatured} onChange={(event) => setEditor({ ...editor, isFeatured: event.target.checked })} />
                Featured in brand strip
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditor(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => void save()} disabled={busy || !editor.name.trim()}>{busy ? 'Saving...' : 'Save brand'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span>
      <input className="input mt-1.5" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
