'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useRouteParams } from '@/lib/useRouteParams';

export default function ProfilePage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', newsletterOptIn: false });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => { if (user) setForm({ firstName: user.firstName, lastName: user.lastName, phone: '', newsletterOptIn: false }); }, [user]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      await api.put('/account/profile', form, { country: region });
      setMsg('Profile updated');
      await refresh();
    } catch (e) { setErr((e as Error).message); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setErr(null);
    try {
      await api.put('/auth/change-password', pw, { country: region });
      setMsg('Password changed — please sign in again');
      router.push('/auth/login');
    } catch (e) { setErr((e as Error).message); }
  }

  if (!user) return <div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>;

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'Profile' }]} />
      <header className="mt-4 mb-6"><div className="section-eyebrow">Account</div><h1 className="mt-1 text-3xl font-extrabold">Profile</h1></header>

      {msg && <div className="card p-3 mb-4 text-sm rounded-lg bg-status-success/10 text-status-success">✓ {msg}</div>}
      {err && <div className="card p-3 mb-4 text-sm rounded-lg bg-status-error/10 text-status-error">⚠ {err}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <form onSubmit={saveProfile} className="card p-6 space-y-3">
          <h2 className="font-extrabold">Personal info</h2>
          <Field label="Email" value={user.email} disabled />
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Field label="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Field label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+971 50 000 0000" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm({ ...form, newsletterOptIn: e.target.checked })} /> Subscribe to product alerts & B2B pricing
          </label>
          <button className="btn-primary mt-2">Save changes</button>
        </form>

        <form onSubmit={changePassword} className="card p-6 space-y-3">
          <h2 className="font-extrabold">Change password</h2>
          <Field type="password" label="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <Field type="password" label="New password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          <Field type="password" label="Confirm new password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} />
          <button className="btn-outline mt-2">Change password</button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{label}</span>
      <input className="input mt-1.5" {...props} />
    </label>
  );
}
