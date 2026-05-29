'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Coupon {
  id: number;
  code: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minOrderValue: number;
  usageLimitTotal: number | null;
  usageLimitPerUser: number;
  usageCount: number;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}

interface CouponForm {
  id?: number;
  code: string;
  description: string;
  discountType: Coupon['discountType'];
  discountValue: number;
  minOrderValue: number;
  usageLimitTotal: string;
  usageLimitPerUser: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

const empty = (): CouponForm => ({
  code: '', description: '', discountType: 'percentage', discountValue: 10, minOrderValue: 0,
  usageLimitTotal: '', usageLimitPerUser: 1, startsAt: '', expiresAt: '', isActive: true,
});

export default function AdminCoupons() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [editor, setEditor] = useState<CouponForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<Coupon[]>('/admin/coupons').then((response) => setRows(response.data)).catch((err) => setError((err as Error).message));
  }

  useEffect(load, []);

  async function save() {
    if (!editor?.code.trim()) return;
    const payload = {
      code: editor.code.trim().toUpperCase(),
      description: editor.description,
      discountType: editor.discountType,
      discountValue: editor.discountValue,
      minOrderValue: editor.minOrderValue,
      usageLimitTotal: editor.usageLimitTotal ? Number(editor.usageLimitTotal) : null,
      usageLimitPerUser: editor.usageLimitPerUser,
      appliesTo: 'all',
      applicableIds: [],
      countryIds: [],
      startsAt: editor.startsAt ? new Date(editor.startsAt).toISOString() : undefined,
      expiresAt: editor.expiresAt ? new Date(editor.expiresAt).toISOString() : undefined,
      isActive: editor.isActive,
    };
    try {
      if (editor.id) await api.put(`/admin/coupons/${editor.id}`, payload);
      else await api.post('/admin/coupons', payload);
      setMessage(editor.id ? 'Coupon updated.' : 'Coupon created.');
      setEditor(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function edit(row: Coupon) {
    setEditor({
      id: row.id,
      code: row.code,
      description: row.description ?? '',
      discountType: row.discountType,
      discountValue: Number(row.discountValue),
      minOrderValue: Number(row.minOrderValue),
      usageLimitTotal: row.usageLimitTotal == null ? '' : String(row.usageLimitTotal),
      usageLimitPerUser: row.usageLimitPerUser,
      startsAt: row.startsAt?.slice(0, 10) ?? '',
      expiresAt: row.expiresAt?.slice(0, 10) ?? '',
      isActive: row.isActive,
    });
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><div className="section-eyebrow">Marketing</div><h1 className="mt-1 text-3xl font-extrabold">Coupons</h1><p className="text-sm text-brand-gray">{rows.length} coupon{rows.length === 1 ? '' : 's'}</p></div>
        <div className="flex gap-2"><Link href="/admin/promotions" className="btn-outline">&lt;- Promotions</Link><button className="btn-primary" onClick={() => setEditor(empty())}>+ New coupon</button></div>
      </header>
      {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray">
            <tr><th className="p-4">Code</th><th className="p-4">Type</th><th className="p-4">Value</th><th className="p-4">Usage</th><th className="p-4">Expires</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="p-4 font-mono font-bold text-brand-blue">{row.code}</td>
                <td className="p-4"><span className="badge-blue">{row.discountType.replace('_', ' ')}</span></td>
                <td className="p-4 font-mono">{row.discountType === 'percentage' ? `${row.discountValue}%` : row.discountValue}</td>
                <td className="p-4 text-xs">{row.usageCount} / {row.usageLimitTotal ?? 'Unlimited'}</td>
                <td className="p-4 text-xs">{row.expiresAt ? formatDate(row.expiresAt) : 'No expiry'}</td>
                <td className="p-4"><span className={`badge ${row.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{row.isActive ? 'Active' : 'Paused'}</span></td>
                <td className="p-4 text-right"><button className="btn-outline btn-sm" onClick={() => edit(row)}>Edit</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="p-10 text-center text-brand-gray" colSpan={7}>No coupons yet. Create a code above.</td></tr>}
          </tbody>
        </table>
      </div>
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card w-full max-w-xl space-y-4 p-6">
            <h2 className="text-xl font-extrabold">{editor.id ? 'Edit coupon' : 'New coupon'}</h2>
            <Field label="Coupon code *" value={editor.code} onChange={(value) => setEditor({ ...editor, code: value.toUpperCase() })} />
            <Field label="Description" value={editor.description} onChange={(value) => setEditor({ ...editor, description: value })} />
            <div className="grid grid-cols-2 gap-3">
              <label><Caption text="Discount type" /><select className="input mt-1.5" value={editor.discountType} onChange={(event) => setEditor({ ...editor, discountType: event.target.value as Coupon['discountType'] })}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option><option value="free_shipping">Free shipping</option></select></label>
              <NumberField label="Discount value" value={editor.discountValue} onChange={(value) => setEditor({ ...editor, discountValue: value })} />
              <NumberField label="Minimum order" value={editor.minOrderValue} onChange={(value) => setEditor({ ...editor, minOrderValue: value })} />
              <Field label="Total uses (blank unlimited)" type="number" value={editor.usageLimitTotal} onChange={(value) => setEditor({ ...editor, usageLimitTotal: value })} />
              <NumberField label="Uses per customer" value={editor.usageLimitPerUser} onChange={(value) => setEditor({ ...editor, usageLimitPerUser: value })} integer />
              <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.isActive} onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })} /> Active</label>
              <Field label="Starts on" type="date" value={editor.startsAt} onChange={(value) => setEditor({ ...editor, startsAt: value })} />
              <Field label="Expires on" type="date" value={editor.expiresAt} onChange={(value) => setEditor({ ...editor, expiresAt: value })} />
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEditor(null)}>Cancel</button><button className="btn-primary" onClick={() => void save()}>Save coupon</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Caption({ text }: { text: string }) {
  return <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{text}</span>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><Caption text={label} /><input type={type} min={type === 'number' ? '0' : undefined} className="input mt-1.5" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NumberField({ label, value, onChange, integer = false }: { label: string; value: number; onChange: (value: number) => void; integer?: boolean }) {
  return <label className="block"><Caption text={label} /><input type="number" min="0" step={integer ? '1' : '0.01'} className="input mt-1.5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
