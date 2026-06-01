'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface InventoryRow {
  id: number;
  productVariantId: number;
  countryId: number;
  variant: { variantSku: string; product: { title: string } };
  country: { countryCode: string; currencyCode: string };
  retailPrice: number | null;
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

const COUNTRY_CURRENCY: Record<string, string> = { AE: 'AED', KE: 'KES', DE: 'EUR', GL: 'USD', US: 'USD' };

interface PricingRow {
  id: number;
  countryId: number;
  countryCode: string;
  currencyCode: string;
  retailPrice: string;
  compareAtPrice: string;
  costPrice: string;
}

interface VariantEditor {
  variantId: number;
  sku: string;
  title: string;
  stockOnHand: string;
  stockReserved: string;
  stockLowThreshold: string;
  isAvailable: boolean;
  pricing: PricingRow[];
  adjustmentType: 'received' | 'returned' | 'damaged' | 'correction' | 'transfer';
  quantityDelta: string;
  note: string;
  adjustments: Adjustment[];
}

interface VariantGroup {
  variantId: number;
  sku: string;
  title: string;
  primary: InventoryRow;
  rows: InventoryRow[];
}

export default function AdminInventory() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editor, setEditor] = useState<VariantEditor | null>(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (query.trim()) params.set('search', query.trim());
    if (stockFilter !== 'all') params.set('stock', stockFilter);
    api.get<InventoryRow[]>(`/admin/inventory?${params.toString()}`)
      .then((r) => setRows(r.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Group all regional rows by variant — one row per variant in the table.
  const groups = useMemo<VariantGroup[]>(() => {
    const map = new Map<number, InventoryRow[]>();
    for (const row of rows) {
      if (!map.has(row.productVariantId)) map.set(row.productVariantId, []);
      map.get(row.productVariantId)!.push(row);
    }
    return [...map.values()].map((variantRows) => {
      // GL (global) row is the stock source of truth; fall back to first row
      const primary = variantRows.find((r) => r.country.countryCode === 'GL') ?? variantRows[0];
      return {
        variantId: primary.productVariantId,
        sku: primary.variant.variantSku,
        title: primary.variant.product.title,
        primary,
        rows: variantRows,
      };
    });
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.title.toLowerCase().includes(q) || g.sku.toLowerCase().includes(q));
  }, [groups, query]);

  async function openEditor(group: VariantGroup) {
    const adjustments = await api.get<Adjustment[]>(`/admin/inventory/${group.primary.id}/adjustments`).then((r) => r.data).catch(() => []);
    setEditor({
      variantId: group.variantId,
      sku: group.sku,
      title: group.title,
      stockOnHand: String(Number(group.primary.stockOnHand ?? 0)),
      stockReserved: String(Number(group.primary.stockReserved ?? 0)),
      stockLowThreshold: String(Number(group.primary.stockLowThreshold ?? 5)),
      isAvailable: group.primary.isAvailable,
      pricing: group.rows.map((r) => ({
        id: r.id,
        countryId: r.countryId,
        countryCode: r.country.countryCode,
        currencyCode: COUNTRY_CURRENCY[r.country.countryCode] ?? r.country.currencyCode ?? 'USD',
        retailPrice: r.retailPrice == null ? '' : String(Number(r.retailPrice)),
        compareAtPrice: r.compareAtPrice == null ? '' : String(Number(r.compareAtPrice)),
        costPrice: r.costPrice == null ? '' : String(Number(r.costPrice)),
      })),
      adjustmentType: 'received',
      quantityDelta: '',
      note: '',
      adjustments,
    });
  }

  // Save global stock — updates ALL regional rows for this variant at once
  async function saveStock() {
    if (!editor) return;
    setError(null);
    try {
      await api.put(`/admin/inventory/variants/${editor.variantId}/stock`, {
        stockOnHand: Number(editor.stockOnHand || 0),
        stockReserved: Number(editor.stockReserved || 0),
        stockLowThreshold: Number(editor.stockLowThreshold || 0),
        isAvailable: editor.isAvailable,
      });
      setMessage('Stock updated across all regions.');
      setEditor(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Save pricing for one specific region row (pricing is per-region)
  async function savePricing(row: PricingRow) {
    if (!editor) return;
    setError(null);
    try {
      await api.put(`/admin/inventory/${row.id}`, {
        retailPrice: row.retailPrice.trim() ? Number(row.retailPrice) : null,
        compareAtPrice: row.compareAtPrice.trim() ? Number(row.compareAtPrice) : null,
        costPrice: Number(row.costPrice || 0),
      });
      setMessage(`${row.countryCode} pricing saved.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Apply adjustment then sync the new stock level to every region
  async function adjustStock() {
    if (!editor || !editor.quantityDelta) return;
    setError(null);
    const delta = Number(editor.quantityDelta);
    try {
      await api.post('/admin/inventory/adjust', {
        variantId: editor.variantId,
        countryId: editor.pricing.find((p) => p.countryCode === 'GL')?.countryId ?? editor.pricing[0]?.countryId,
        type: editor.adjustmentType,
        quantityDelta: delta,
        note: editor.note.trim() || undefined,
      });
      // Propagate the resulting stock level to all regions
      const newStock = Math.max(0, Number(editor.stockOnHand) + delta);
      await api.put(`/admin/inventory/variants/${editor.variantId}/stock`, {
        stockOnHand: newStock,
        stockReserved: Number(editor.stockReserved || 0),
        stockLowThreshold: Number(editor.stockLowThreshold || 0),
        isAvailable: editor.isAvailable,
      });
      setMessage('Adjustment applied and synced to all regions.');
      setEditor(null);
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
          <h1 className="mt-1 text-3xl font-extrabold">Inventory</h1>
          <p className="text-sm text-brand-gray">Global stock — one row per variant. Stock applies to all regions; pricing is set per-region in the editor.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Search SKU or product…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className="input w-36" value={stockFilter} onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}>
            <option value="all">All stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <button className="btn-outline" onClick={load}>Apply</button>
          <button
            className="btn-ghost"
            title="Create missing pricing rows for all variants × active countries"
            onClick={async () => {
              if (!confirm('Initialize missing inventory rows for all variants × active countries?')) return;
              try {
                const r = await api.post<{ created: number }>('/admin/inventory/backfill', {});
                setMessage(`Backfill done — ${r.data.created} row(s) created.`);
                load();
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >Init missing rows</button>
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
              <th className="p-4 text-right">Stock</th>
              <th className="p-4 text-right">Regions</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-10 text-center text-brand-gray" colSpan={6}>Loading inventory…</td></tr>}
            {!loading && visible.map((group) => {
              const stock = Number(group.primary.stockOnHand ?? 0);
              const reserved = Number(group.primary.stockReserved ?? 0);
              const threshold = Number(group.primary.stockLowThreshold ?? 5);
              const available = Math.max(0, stock - reserved);
              const low = available > 0 && available <= threshold;
              const out = available === 0;
              return (
                <tr key={group.variantId} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-4 font-semibold line-clamp-1">{group.title}</td>
                  <td className="p-4 font-mono text-xs">{group.sku}</td>
                  <td className={`p-4 text-right font-mono font-bold ${out ? 'text-status-error' : low ? 'text-status-warning' : ''}`}>
                    {available} / {stock}
                  </td>
                  <td className="p-4 text-right text-xs text-brand-gray">{group.rows.length}</td>
                  <td className="p-4">
                    <span className={`badge ${!group.primary.isAvailable || out ? 'badge-error' : low ? 'badge-warning' : 'badge-success'}`}>
                      {!group.primary.isAvailable ? 'Hidden' : out ? 'Out of stock' : low ? 'Low stock' : 'Available'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="btn-outline btn-sm" onClick={() => void openEditor(group)}>Manage</button>
                  </td>
                </tr>
              );
            })}
            {!loading && visible.length === 0 && (
              <tr><td className="p-10 text-center text-brand-gray" colSpan={6}>No inventory rows found. Run "Init missing rows" if the table is empty.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card max-h-[92vh] w-full max-w-4xl overflow-auto p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="section-eyebrow">Manage inventory</div>
                <h2 className="mt-1 text-xl font-extrabold">{editor.title}</h2>
                <p className="font-mono text-xs text-brand-gray">{editor.sku}</p>
              </div>
              <button className="text-2xl text-brand-gray" onClick={() => setEditor(null)}>×</button>
            </div>

            {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}
            {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Global stock */}
              <section className="space-y-3">
                <h3 className="font-extrabold">Global stock <span className="text-xs font-normal text-brand-gray ml-1">— applies to all regions</span></h3>
                <StockField label="Stock on hand" value={editor.stockOnHand} onChange={(v) => setEditor({ ...editor, stockOnHand: v })} />
                <StockField label="Reserved stock" value={editor.stockReserved} onChange={(v) => setEditor({ ...editor, stockReserved: v })} />
                <StockField label="Low stock threshold" value={editor.stockLowThreshold} onChange={(v) => setEditor({ ...editor, stockLowThreshold: v })} />
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                  <input type="checkbox" checked={editor.isAvailable} onChange={(e) => setEditor({ ...editor, isAvailable: e.target.checked })} />
                  Available on storefront
                </label>
                <button className="btn-primary" onClick={() => void saveStock()}>Save stock (all regions)</button>
              </section>

              {/* Stock adjustment */}
              <section className="space-y-3">
                <h3 className="font-extrabold">Manual adjustment <span className="text-xs font-normal text-brand-gray ml-1">— syncs to all regions</span></h3>
                <select className="input" value={editor.adjustmentType} onChange={(e) => setEditor({ ...editor, adjustmentType: e.target.value as VariantEditor['adjustmentType'] })}>
                  <option value="received">Received stock</option>
                  <option value="returned">Returned stock</option>
                  <option value="damaged">Damaged stock</option>
                  <option value="correction">Correction</option>
                  <option value="transfer">Transfer</option>
                </select>
                <StockField label="Quantity delta (+/-)" value={editor.quantityDelta} onChange={(v) => setEditor({ ...editor, quantityDelta: v })} />
                <textarea className="input min-h-[70px]" placeholder="Note" value={editor.note} onChange={(e) => setEditor({ ...editor, note: e.target.value })} />
                <button className="btn-yellow" onClick={() => void adjustStock()} disabled={!editor.quantityDelta}>Apply adjustment</button>
                <div className="max-h-40 overflow-auto space-y-1.5 text-xs">
                  {editor.adjustments.map((a) => (
                    <div key={a.id} className="rounded-lg border border-gray-100 p-2.5">
                      <div className="flex justify-between font-semibold"><span className="capitalize">{a.adjustmentType}</span><span className="font-mono">{a.quantityDelta > 0 ? '+' : ''}{a.quantityDelta}</span></div>
                      <div className="text-brand-gray">{a.quantityBefore} → {a.quantityAfter} · {formatDate(a.createdAt)}</div>
                      {a.note && <div className="text-brand-gray">{a.note}</div>}
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Per-region pricing */}
            <section className="mt-6 space-y-3">
              <h3 className="font-extrabold">Regional pricing <span className="text-xs font-normal text-brand-gray ml-1">— each region saved independently</span></h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.18em] text-brand-gray text-left">
                    <tr>
                      <th className="pb-2 pr-3">Region</th>
                      <th className="pb-2 pr-3">Retail price</th>
                      <th className="pb-2 pr-3">Compare at</th>
                      <th className="pb-2 pr-3">Cost price</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {editor.pricing.map((pr, idx) => (
                      <tr key={pr.id}>
                        <td className="py-2 pr-3 font-mono font-bold text-xs">
                          {pr.countryCode} <span className="font-normal text-brand-gray">{pr.currencyCode}</span>
                        </td>
                        {(['retailPrice', 'compareAtPrice', 'costPrice'] as const).map((field) => (
                          <td key={field} className="py-2 pr-3">
                            <input
                              type="number" step="0.01" className="input w-28" placeholder={field === 'costPrice' ? '0' : '—'}
                              value={pr[field]}
                              onChange={(e) => {
                                const next = [...editor.pricing];
                                next[idx] = { ...pr, [field]: e.target.value };
                                setEditor({ ...editor, pricing: next });
                              }}
                            />
                          </td>
                        ))}
                        <td className="py-2">
                          <button className="btn-outline btn-sm whitespace-nowrap" onClick={() => void savePricing(pr)}>
                            Save {pr.countryCode}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function StockField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span>
      <input type="number" step="1" className="input mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
