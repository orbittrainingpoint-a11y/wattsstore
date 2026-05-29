'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';

function VerifyInner() {
  const token = useSearchParams().get('token') ?? '';
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    fetch(`/api/v1/auth/verify-email/${token}`).then((r) => setStatus(r.ok || r.redirected ? 'ok' : 'error')).catch(() => setStatus('error'));
  }, [token]);

  return (
    <AuthShell title="Email verification" sub="Activating your WattsStore account…">
      <div className="text-center">
        {status === 'pending' && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-brand-blue border-t-transparent spin-slow" />
            <p className="mt-4 text-sm text-brand-gray">Verifying your email…</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-3xl shadow-lg shadow-emerald-500/30 floaty">✓</div>
            <p className="mt-4 text-sm font-semibold text-status-success">Email verified — you can now place orders.</p>
            <Link href="/auth/login" className="btn-primary mt-6 w-full">Sign In →</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-status-error to-rose-700 text-white flex items-center justify-center text-3xl shadow-lg">✕</div>
            <p className="mt-4 text-sm text-status-error">This verification link is invalid or expired.</p>
            <Link href="/auth/forgot-password" className="btn-outline mt-6 w-full">Request a new link</Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell title="Email verification"><p className="text-sm text-brand-gray">Loading…</p></AuthShell>}>
      <VerifyInner />
    </Suspense>
  );
}
