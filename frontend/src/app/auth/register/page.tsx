'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const strength = useMemo(() => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }, [form.password]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/auth/register', form);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell title="Almost there" sub="One last step before you can place orders.">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] flex items-center justify-center text-3xl text-white shadow-lg shadow-brand-blue/30 floaty">📧</div>
          <p className="mt-4 text-sm text-brand-gray">We sent a verification link to</p>
          <p className="mt-1 font-mono font-bold text-brand-blue">{form.email}</p>
          <Link href="/auth/login" className="btn-primary mt-6 w-full">Back to Sign In</Link>
        </div>
      </AuthShell>
    );
  }

  const strengthBar = ['bg-gray-200', 'bg-status-error', 'bg-status-warning', 'bg-status-warning', 'bg-status-success'][strength];
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];

  return (
    <AuthShell title="Create your account" sub="Free to join · No card required.">
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={form.firstName} onChange={upd('firstName')} required />
          <Field label="Last name" value={form.lastName} onChange={upd('lastName')} required />
        </div>
        <Field label="Email" type="email" value={form.email} onChange={upd('email')} required placeholder="you@company.com" />
        <Field label="Phone (optional)" type="tel" value={form.phone} onChange={upd('phone')} />
        <div>
          <Field label="Password" type="password" value={form.password} onChange={upd('password')} required placeholder="8+ chars · upper · lower · digit" />
          {form.password && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1,2,3,4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? strengthBar : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="mt-1 text-[11px] text-brand-gray">{strengthLabel}</div>
            </div>
          )}
        </div>
        {error && <p className="rounded-lg bg-status-error/10 text-status-error text-sm p-2.5">⚠ {error}</p>}
        <label className="flex items-start gap-2 text-xs text-brand-gray">
          <input type="checkbox" required className="mt-0.5" />
          <span>I agree to the <Link href="/ae/terms-of-service" className="text-brand-blue link-underline">Terms</Link> and <Link href="/ae/privacy-policy" className="text-brand-blue link-underline">Privacy Policy</Link>.</span>
        </label>
        <button className="btn-primary w-full btn-lg" disabled={busy}>
          {busy ? 'Creating account…' : 'Create Account →'}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-brand-gray">
        Already have an account? <Link href="/auth/login" className="text-brand-blue font-semibold link-underline">Sign in</Link>
      </p>
    </AuthShell>
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
