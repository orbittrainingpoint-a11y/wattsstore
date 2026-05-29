'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface AdminProduct { id: number; title: string; skuBase: string; isActive: boolean; brand?: { name: string } | null; category?: { name: string } | null; _count: { variants: number } }
interface Category { id: number; name: string; depth?: number; isActive?: boolean }

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [categoryId, setCategoryId] = useState(0);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'all') params.set('status', status);
    if (categoryId) params.set('categoryId', String(categoryId));
    api.get<AdminProduct[]>(`/admin/products?${params.toString()}`)
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }
  useEffect(() => { api.get<Category[]>('/admin/categories').then((r) => setCategories(r.data)).catch(() => undefined); }, []);
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function restore(id: number) {
    await api.put(`/admin/products/${id}/restore`);
    load();
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Catalog</div>
          <h1 className="mt-1 text-3xl font-extrabold">Products</h1>
          <p className="text-sm text-brand-gray">{loading ? 'Loading…' : `${products.length} product${products.length === 1 ? '' : 's'}`}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex gap-2">
            <input className="input !rounded-full !pl-9 relative" placeholder="Search title or SKU…" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke-width=%221.5%22 stroke=%22%234a5568%22%3E%3Cpath stroke-linecap=%22round%22 stroke-linejoin=%22round%22 d=%22M21 21l-4.34-4.34m0 0A8 8 0 105.66 5.66a8 8 0 0011 11z%22 /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: '12px center', backgroundSize: '16px' }}
            />
            <select className="input w-36" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <select className="input w-48" value={categoryId} onChange={(event) => setCategoryId(Number(event.target.value))}>
              <option value={0}>All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{`${'-- '.repeat(Math.max(0, (category.depth ?? 1) - 1))}${category.name}`}</option>)}
            </select>
            <button className="btn-outline">Search</button>
          </form>
          <Link href="/admin/catalog/products/new" className="btn-primary">+ New Product</Link>
        </div>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left" style={{ background: 'linear-gradient(180deg,#eef3fa 0%,#f7f9fc 100%)' }}>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-brand-gray">
              <th className="p-4 font-bold">Product</th>
              <th className="p-4 font-bold">SKU</th>
              <th className="p-4 font-bold">Category</th>
              <th className="p-4 font-bold">Brand</th>
              <th className="p-4 font-bold">Variants</th>
              <th className="p-4 font-bold">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-brand-gray" colSpan={7}>Loading products…</td></tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="p-10 text-center text-brand-gray" colSpan={7}>
                  <div className="text-5xl">📦</div>
                  <p className="mt-3 font-semibold text-brand-dark">No products found</p>
                  <p className="text-xs">Seed the database with <code className="font-mono text-brand-blue">npm run seed</code> or create one.</p>
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-yellow/15 flex items-center justify-center text-base shrink-0">⚡</div>
                    <span className="font-medium">{p.title}</span>
                  </td>
                  <td className="p-4 font-mono text-xs">{p.skuBase}</td>
                  <td className="p-4 text-xs">{p.category?.name ?? '—'}</td>
                  <td className="p-4 text-xs">{p.brand?.name ?? '—'}</td>
                  <td className="p-4"><span className="badge-blue">{p._count.variants}</span></td>
                  <td className="p-4">
                    <span className={`badge ${p.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>
                      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${p.isActive ? 'bg-status-success' : 'bg-gray-400'}`} />
                      {p.isActive ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!p.isActive && <button className="text-status-success text-xs font-semibold hover:underline" onClick={() => void restore(p.id)}>Unarchive</button>}
                      <Link href={`/admin/catalog/products/${p.id}/edit`} className="text-brand-blue text-xs font-semibold hover:underline">Edit -&gt;</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
