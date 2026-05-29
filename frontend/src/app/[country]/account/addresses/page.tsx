'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useRouteParams } from '@/lib/useRouteParams';

interface Address { id: number; addressLabel: string | null; firstName: string; lastName: string; addressLine1: string; addressLine2?: string | null; city: string; countryCode: string; phone?: string | null; isDefault: boolean }

const EMPTY = { addressLabel: 'Home', firstName: '', lastName: '', addressLine1: '', city: '', countryCode: 'AE', phone: '' };

export default function AddressesPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [list, setList] = useState<Address[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => { if (user) load(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  function load() { api.get<Address[]>('/account/addresses', { country: region }).then((r) => setList(r.data)).catch(() => setList([])); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      if (editingId) await api.put(`/account/addresses/${editingId}`, form, { country: region });
      else await api.post('/account/addresses', form, { country: region });
      setOpen(false); setEditingId(null); setForm(EMPTY); load();
    } catch (e) { setErr((e as Error).message); }
  }
  async function remove(id: number) {
    if (!confirm('Delete this address?')) return;
    await api.del(`/account/addresses/${id}`, { country: region });
    load();
  }
  async function setDefault(id: number) { await api.post(`/account/addresses/${id}/default`, undefined, { country: region }); load(); }
  function edit(a: Address) {
    setForm({
      addressLabel: a.addressLabel ?? 'Home',
      firstName: a.firstName,
      lastName: a.lastName,
      addressLine1: a.addressLine1,
      city: a.city,
      countryCode: a.countryCode,
      phone: a.phone ?? '',
    });
    setEditingId(a.id);
    setOpen(true);
  }

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'Addresses' }]} />
      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><div className="section-eyebrow">Account</div><h1 className="mt-1 text-3xl font-extrabold">Address book</h1></div>
        <button onClick={() => { setForm(EMPTY); setEditingId(null); setOpen(true); }} className="btn-primary">+ Add address</button>
      </header>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl">🏠</div>
          <p className="mt-3 font-semibold">No saved addresses</p>
          <p className="mt-1 text-sm text-brand-gray">Add your first address to speed up checkout.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-blue">{a.addressLabel ?? 'Address'}</span>
                {a.isDefault && <span className="badge-success">Default</span>}
              </div>
              <div className="text-sm font-semibold">{a.firstName} {a.lastName}</div>
              <div className="mt-1 text-xs text-brand-gray leading-relaxed">{a.addressLine1}{a.addressLine2 && `, ${a.addressLine2}`}<br/>{a.city} · {a.countryCode}</div>
              {a.phone && <div className="mt-1 text-xs text-brand-gray">{a.phone}</div>}
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => edit(a)} className="btn-outline btn-sm">Edit</button>
                {!a.isDefault && <button onClick={() => setDefault(a.id)} className="btn-ghost btn-sm">Set default</button>}
                <button onClick={() => remove(a.id)} className="text-xs text-status-error hover:underline ml-auto">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-dark/50 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <form onSubmit={save} className="card p-6 w-full max-w-md relative space-y-3">
            <h2 className="font-extrabold text-lg">{editingId ? 'Edit address' : 'New address'}</h2>
            {err && <p className="text-sm text-status-error rounded bg-status-error/10 p-2">⚠ {err}</p>}
            <input className="input" placeholder="Label (Home / Office / Site)" value={form.addressLabel} onChange={(e) => setForm({ ...form, addressLabel: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="First name" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <input className="input" placeholder="Last name" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <input className="input" placeholder="Address" required value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <select className="input" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
                <option value="AE">UAE</option><option value="KE">Kenya</option><option value="DE">Germany</option>
              </select>
            </div>
            <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary">{editingId ? 'Save' : 'Add'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
