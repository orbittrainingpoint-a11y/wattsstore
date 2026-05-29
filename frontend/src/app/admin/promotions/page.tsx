'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Promo {
  id: number;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed_amount' | 'free_shipping';
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
}

interface PromoForm {
  id?: number;
  name: string;
  description: string;
  discountType: Promo['discountType'];
  discountValue: number;
  minOrderValue: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

function emptyPromo(): PromoForm {
  return { name: '', description: '', discountType: 'percentage', discountValue: 10, minOrderValue: 0, startsAt: new Date().toISOString().slice(0, 10), endsAt: '', isActive: true };
}

export default function AdminPromotions() {
  const [items, setItems] = useState<Promo[]>([]);
  const [editor, setEditor] = useState<PromoForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<Promo[]>('/admin/promotions').then((response) => setItems(response.data)).catch((err) => setError((err as Error).message));
  }

  useEffect(load, []);

  async function save() {
    if (!editor?.name.trim()) return;
    const payload = {
      ...editor,
      startsAt: new Date(editor.startsAt).toISOString(),
      endsAt: editor.endsAt ? new Date(editor.endsAt).toISOString() : undefined,
      applicableIds: [],
      countryIds: [],
    };
    try {
      if (editor.id) await api.put(`/admin/promotions/${editor.id}`, payload);
      else await api.post('/admin/promotions', payload);
      setMessage(editor.id ? 'Promotion updated.' : 'Promotion created.');
      setEditor(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function pause(item: Promo) {
    try {
      await api.del(`/admin/promotions/${item.id}`);
      setMessage('Promotion paused.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><div className="section-eyebrow">Marketing</div><h1 className="mt-1 text-3xl font-extrabold">Promotions</h1></div>
        <div className="flex gap-2">
          <Link href="/admin/promotions/coupons" className="btn-outline">Coupons -&gt;</Link>
          <button className="btn-primary" onClick={() => setEditor(emptyPromo())}>+ New promotion</button>
        </div>
      </header>
      {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray">
            <tr><th className="p-4">Name</th><th className="p-4">Type</th><th className="p-4">Value</th><th className="p-4">Window</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="p-4 font-semibold">{item.name}</td>
                <td className="p-4"><span className="badge-blue">{item.discountType.replace('_', ' ')}</span></td>
                <td className="p-4 font-mono">{item.discountType === 'percentage' ? `${item.discountValue}%` : item.discountValue}</td>
                <td className="p-4 text-xs">{new Date(item.startsAt).toLocaleDateString()} - {item.endsAt ? new Date(item.endsAt).toLocaleDateString() : 'Open'}</td>
                <td className="p-4"><span className={`badge ${item.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{item.isActive ? 'Active' : 'Paused'}</span></td>
                <td className="p-4 text-right"><button className="btn-outline btn-sm mr-2" onClick={() => setEditor({ ...item, description: item.description ?? '', discountValue: Number(item.discountValue), minOrderValue: Number(item.minOrderValue), startsAt: item.startsAt.slice(0, 10), endsAt: item.endsAt?.slice(0, 10) ?? '' })}>Edit</button>{item.isActive && <button className="btn-ghost btn-sm text-status-error" onClick={() => void pause(item)}>Pause</button>}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td className="p-10 text-center text-brand-gray" colSpan={6}>No promotions yet. Create the first campaign above.</td></tr>}
          </tbody>
        </table>
      </div>
      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card w-full max-w-xl space-y-4 p-6">
            <h2 className="text-xl font-extrabold">{editor.id ? 'Edit promotion' : 'New promotion'}</h2>
            <Field label="Name *" value={editor.name} onChange={(value) => setEditor({ ...editor, name: value })} />
            <Field label="Description" value={editor.description} onChange={(value) => setEditor({ ...editor, description: value })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><Caption text="Discount type" /><select className="input mt-1.5" value={editor.discountType} onChange={(event) => setEditor({ ...editor, discountType: event.target.value as Promo['discountType'] })}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option><option value="free_shipping">Free shipping</option></select></label>
              <NumberField label="Discount value" value={editor.discountValue} onChange={(value) => setEditor({ ...editor, discountValue: value })} />
              <NumberField label="Minimum order" value={editor.minOrderValue} onChange={(value) => setEditor({ ...editor, minOrderValue: value })} />
              <label className="mt-7 flex items-center gap-2 text-sm"><input type="checkbox" checked={editor.isActive} onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })} /> Active</label>
              <Field label="Starts on" type="date" value={editor.startsAt} onChange={(value) => setEditor({ ...editor, startsAt: value })} />
              <Field label="Ends on" type="date" value={editor.endsAt} onChange={(value) => setEditor({ ...editor, endsAt: value })} />
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEditor(null)}>Cancel</button><button className="btn-primary" onClick={() => void save()}>Save promotion</button></div>
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
  return <label className="block"><Caption text={label} /><input type={type} className="input mt-1.5" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="block"><Caption text={label} /><input type="number" min="0" step="0.01" className="input mt-1.5" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
