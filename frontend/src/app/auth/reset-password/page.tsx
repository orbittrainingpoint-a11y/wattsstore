'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword, confirmPassword });
      router.push('/auth/login');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Choose a new password" sub="Pick something memorable but strong.">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">New password</span>
          <input className="input mt-1.5" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Confirm password</span>
          <input className="input mt-1.5" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </label>
        {error && <p className="rounded-lg bg-status-error/10 text-status-error text-sm p-2.5">⚠ {error}</p>}
        <button className="btn-primary w-full btn-lg" disabled={busy}>{busy ? 'Resetting…' : 'Reset Password →'}</button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthShell title="Choose a new password"><p className="text-sm text-brand-gray">Loading…</p></AuthShell>}>
      <ResetForm />
    </Suspense>
  );
}
