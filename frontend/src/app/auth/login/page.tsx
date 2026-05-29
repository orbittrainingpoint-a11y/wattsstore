'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';
import { User } from '@/types';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
      const adminHome = ['admin', 'super_admin', 'sales_agent'].includes(data.user.role) ? '/admin' : '/ae/account';
      router.push(params.get('next') ?? adminHome);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" sub="Sign in to access orders, quotes and wishlists.">
      {params.get('verified') === 'true' && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">
          <span>✓</span><span>Email verified — please sign in.</span>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Email</span>
          <input className="input mt-1.5" name="email" autoComplete="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold flex justify-between">
            <span>Password</span>
            <Link href="/auth/forgot-password" className="text-brand-blue normal-case tracking-normal font-medium link-underline">Forgot?</Link>
          </span>
          <input className="input mt-1.5" name="password" autoComplete="current-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="rounded-lg bg-status-error/10 text-status-error text-sm p-2.5">⚠ {error}</p>}
        <button className="btn-primary w-full btn-lg" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign In →'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-brand-gray">
        <div className="flex-1 h-px bg-gray-200" />
        <span>or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="btn-outline btn-sm">🔵 Google</button>
        <button className="btn-outline btn-sm">⚫ LinkedIn</button>
      </div>

      <p className="mt-6 text-center text-sm text-brand-gray">
        Don&apos;t have an account? <Link href="/auth/register" className="text-brand-blue font-semibold link-underline">Create one</Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell title="Welcome back"><p className="text-sm text-brand-gray">Loading…</p></AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}
