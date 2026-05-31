'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface InventoryRow {
  id: number;
  productVariantId: number;
  countryId: number;
  variant: { variantSku: string; product: { title: string } };
  country: { countryCode: string; currencyCode?: string };
  retailPrice: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  stockOnHand: number;
  stockReserved: number;
  stockLowThreshold: number;
  baseShippingCost: number;
  perKgAdder: number;
  isAvailable: boolean;
}

interface Adjustment {
  id: number;
  adjustmentType: string;
  quantityDelta: number;
  quantityBefore: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
}

interface Editor {
  row: InventoryRow;
  retailPrice: string;
  compareAtPrice: string;
  costPrice: string;
  stockLowThreshold: string;
  stockOnHand: string;
  stockReserved: string;
  baseShippingCost: string;
  perKgAdder: string;
  isAvailable: boolean;
  adjustmentType: 'received' | 'returned' | 'damaged' | 'correction' | 'transfer';
  quantityDelta: string;
  note: string;
  adjustments: Adjustment[];
}

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'hidden'>('all');
  const [editor, setEditor] = useState<Editor | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (query.trim()) params.set('search', query.trim());
    if (stockFilter !== 'all') params.set('stock', stockFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    api.get<InventoryRow[]>(`/admin/inventory?${params.toString()}`)
      .then((response) => setRows(response.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.variant.product.title, row.variant.variantSku, row.country.countryCode].some((value) => value.toLowerCase().includes(q)),
    );
  }, [query, rows]);

  async function openEditor(row: InventoryRow) {
    const adjustments = await api.get<Adjustment[]>(`/admin/inventory/${row.id}/adjustments`).then((r) => r.data).catch(() => []);
    setEditor({
      row,
      retailPrice: row.retailPrice == null ? '' : String(row.retailPrice),
      compareAtPrice: row.compareAtPrice == null ? '' : String(row.compareAtPrice),
      costPrice: row.costPrice == null ? '' : String(row.costPrice),
      stockLowThreshold: String(row.stockLowThreshold ?? 5),
      stockOnHand: String(row.stockOnHand ?? 0),
      stockReserved: String(row.stockReserved ?? 0),
      baseShippingCost: String(row.baseShippingCost ?? 0),
      perKgAdder: String(row.perKgAdder ?? 0),
      isAvailable: row.isAvailable,
      adjustmentType: 'received',
      quantityDelta: '',
      note: '',
      adjustments,
    });
  }

  async function saveSettings() {
    if (!editor) return;
    setError(null);
    try {
      await api.put(`/admin/inventory/${editor.row.id}`, {
        retailPrice: editor.retailPrice.trim() ? Number(editor.retailPrice) : null,
        compareAtPrice: editor.compareAtPrice.trim() ? Number(editor.compareAtPrice) : null,
        costPrice: editor.costPrice.trim() ? Number(editor.costPrice) : null,
        stockOnHand: Number(editor.stockOnHand || 0),
        stockReserved: Number(editor.stockReserved || 0),
        stockLowThreshold: Number(editor.stockLowThreshold || 0),
        baseShippingCost: Number(editor.baseShippingCost || 0),
        perKgAdder: Number(editor.perKgAdder || 0),
        isAvailable: editor.isAvailable,
      });
      setMessage('Inventory settings saved.');
      setEditor(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function adjustStock() {
    if (!editor || !editor.quantityDelta) return;
    setError(null);
    await api.post('/admin/inventory/adjust', {
      variantId: editor.row.productVariantId,
      countryId: editor.row.countryId,
      type: editor.adjustmentType,
      quantityDelta: Number(editor.quantityDelta),
      note: editor.note.trim() || undefined,
    });
    setMessage('Stock adjusted.');
    setEditor(null);
    load();
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Catalog</div>
          <h1 className="mt-1 text-3xl font-extrabold">Inventory matrix</h1>
          <p className="text-sm text-brand-gray">Edit regional pricing, stock visibility, low-stock thresholds and manual adjustments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Search SKU, product, region..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="input w-36" value={stockFilter} onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)}>
            <option value="all">All stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <select className="input w-36" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All status</option>
            <option value="available">Available</option>
            <option value="hidden">Hidden</option>
          </select>
          <button className="btn-outline" onClick={load}>Apply</button>
          <button
            className="btn-ghost"
            title="Create missing pricing rows for variants that are missing them (safe to run anytime)"
            onClick={async () => {
              if (!confirm('Initialize missing inventory rows for all variants × active countries? This is safe to run repeatedly.')) return;
              try {
                const response = await api.post<{ created: number; variants: number; countries: number }>('/admin/inventory/backfill', {});
                setMessage(`Backfill done — ${response.data.created} new row(s) created across ${response.data.variants} variant(s) and ${response.data.countries} country(ies).`);
                load();
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >Initialize missing rows</button>
        </div>
      </header>

      {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Region</th>
              <th className="p-4 text-right">Price</th>
              <th className="p-4 text-right">Available</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-10 text-center text-brand-gray" colSpan={7}>Loading inventory...</td></tr>}
            {!loading && visible.map((row) => {
              const available = Math.max(0, row.stockOnHand - row.stockReserved);
              const low = available <= row.stockLowThreshold;
              return (
                <tr key={row.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-4 font-semibold line-clamp-1">{row.variant.product.title}</td>
                  <td className="p-4 font-mono text-xs">{row.variant.variantSku}</td>
                  <td className="p-4"><span className="badge-blue">{row.country.countryCode}</span></td>
                  <td className="p-4 text-right font-mono">{formatCurrency(row.retailPrice, row.country.countryCode === 'DE' ? 'EUR' : row.country.countryCode === 'KE' ? 'KES' : 'AED')}</td>
                  <td className={`p-4 text-right font-mono font-bold ${available === 0 ? 'text-status-error' : low ? 'text-status-warning' : 'text-brand-dark'}`}>{available} / {row.stockOnHand}</td>
                  <td className="p-4"><span className={`badge ${!row.isAvailable || available === 0 ? 'badge-error' : low ? 'badge-warning' : 'badge-success'}`}>{!row.isAvailable ? 'Hidden' : available === 0 ? 'Out of stock' : low ? 'Low stock' : 'Available'}</span></td>
                  <td className="p-4 text-right"><button className="btn-outline btn-sm" onClick={() => void openEditor(row)}>Manage</button></td>
                </tr>
              );
            })}
            {!loading && visible.length === 0 && <tr><td className="p-10 text-center text-brand-gray" colSpan={7}>No inventory rows found.</td></tr>}
          </tbody>
        </table>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card max-h-[92vh] w-full max-w-3xl overflow-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="section-eyebrow">Manage inventory</div>
                <h2 className="mt-1 text-xl font-extrabold">{editor.row.variant.product.title}</h2>
                <p className="font-mono text-xs text-brand-gray">{editor.row.variant.variantSku} · {editor.row.country.countryCode}</p>
              </div>
              <button className="text-2xl text-brand-gray" onClick={() => setEditor(null)} aria-label="Close">x</button>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <section className="space-y-3">
                <h3 className="font-extrabold">Pricing & visibility</h3>
                <Field label="Retail price" value={editor.retailPrice} onChange={(value) => setEditor({ ...editor, retailPrice: value })} />
                <Field label="Compare-at price" value={editor.compareAtPrice} onChange={(value) => setEditor({ ...editor, compareAtPrice: value })} />
                <Field label="Cost price" value={editor.costPrice} onChange={(value) => setEditor({ ...editor, costPrice: value })} />
                <Field label="Stock on hand" value={editor.stockOnHand} onChange={(value) => setEditor({ ...editor, stockOnHand: value })} />
                <Field label="Reserved stock" value={editor.stockReserved} onChange={(value) => setEditor({ ...editor, stockReserved: value })} />
                <Field label="Low stock threshold" value={editor.stockLowThreshold} onChange={(value) => setEditor({ ...editor, stockLowThreshold: value })} />
                <Field label="Base shipping cost" value={editor.baseShippingCost} onChange={(value) => setEditor({ ...editor, baseShippingCost: value })} />
                <Field label="Per-kg adder" value={editor.perKgAdder} onChange={(value) => setEditor({ ...editor, perKgAdder: value })} />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={editor.isAvailable} onChange={(event) => setEditor({ ...editor, isAvailable: event.target.checked })} />
                  Available on storefront
                </label>
                <button className="btn-primary" onClick={() => void saveSettings()}>Save settings</button>
              </section>

              <section className="space-y-3">
                <h3 className="font-extrabold">Manual stock adjustment</h3>
                <select className="input" value={editor.adjustmentType} onChange={(event) => setEditor({ ...editor, adjustmentType: event.target.value as Editor['adjustmentType'] })}>
                  <option value="received">Received stock</option>
                  <option value="returned">Returned stock</option>
                  <option value="damaged">Damaged stock</option>
                  <option value="correction">Correction</option>
                  <option value="transfer">Transfer</option>
                </select>
                <Field label="Quantity delta (+/-)" value={editor.quantityDelta} onChange={(value) => setEditor({ ...editor, quantityDelta: value })} />
                <textarea className="input min-h-[90px]" placeholder="Adjustment note" value={editor.note} onChange={(event) => setEditor({ ...editor, note: event.target.value })} />
                <button className="btn-yellow" onClick={() => void adjustStock()} disabled={!editor.quantityDelta}>Apply adjustment</button>

                <div className="pt-4">
                  <h4 className="mb-2 font-bold">Recent adjustments</h4>
                  <div className="max-h-56 space-y-2 overflow-auto text-sm">
                    {editor.adjustments.length === 0 && <p className="text-brand-gray">No adjustments yet.</p>}
                    {editor.adjustments.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex justify-between gap-2">
                          <span className="font-semibold capitalize">{item.adjustmentType}</span>
                          <span className="font-mono">{item.quantityDelta > 0 ? '+' : ''}{item.quantityDelta}</span>
                        </div>
                        <div className="text-xs text-brand-gray">{item.quantityBefore} → {item.quantityAfter} · {formatDate(item.createdAt)}</div>
                        {item.note && <div className="mt-1 text-xs text-brand-gray">{item.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span>
      <input type="number" step="0.01" className="input mt-1.5" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
