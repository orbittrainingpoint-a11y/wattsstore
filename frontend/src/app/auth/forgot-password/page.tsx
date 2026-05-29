'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { AuthShell } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await api.post('/auth/forgot-password', { email }).catch(() => undefined);
    setBusy(false);
    setSent(true); // always show same message (no email enumeration)
  }

  return (
    <AuthShell title="Reset your password" sub="We'll email a secure link valid for 1 hour.">
      {sent ? (
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-brand-blue to-[#4cc9f0] flex items-center justify-center text-3xl text-white shadow-lg shadow-brand-blue/30 floaty">📧</div>
          <p className="mt-4 text-sm text-brand-gray">If <strong>{email}</strong> is registered, a reset link is on its way.</p>
          <Link href="/auth/login" className="btn-primary mt-6 w-full">Back to Sign In</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">Your email</span>
            <input className="input mt-1.5" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <button className="btn-primary w-full btn-lg" disabled={busy}>{busy ? 'Sending…' : 'Send Reset Link →'}</button>
          <p className="mt-2 text-center text-sm text-brand-gray">
            Remembered? <Link href="/auth/login" className="text-brand-blue font-semibold link-underline">Sign in</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
