'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';

export function ReviewForm({ productId }: { productId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!isLoading && !user) {
      setMessage('Please login to submit your review. Your text is still here.');
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setBusy(true);
    try {
      await api.post('/reviews', { productId, rating, title: title.trim() || undefined, body: body.trim() || undefined });
      setMessage('Review submitted. It will appear after approval.');
      setTitle('');
      setBody('');
      setRating(5);
      setOpen(false);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold">Rate this product</h3>
          <p className="text-xs text-brand-gray">Click a star to open the review form. Login is required only when submitting.</p>
        </div>
        <div className="flex items-center gap-1" aria-label="Choose rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => { setRating(value); setOpen(true); setMessage(null); }}
              className={`text-3xl leading-none transition hover:scale-110 ${value <= rating ? 'text-status-warning' : 'text-gray-300'}`}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      {message && <p className="mt-4 rounded-lg bg-brand-light p-3 text-sm text-brand-gray">{message}</p>}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold">Write a review</h3>
                <p className="mt-1 text-xs text-brand-gray">Your rating: {rating} star{rating === 1 ? '' : 's'}</p>
              </div>
              <button type="button" className="rounded-full px-3 py-1 text-xl hover:bg-brand-light" onClick={() => setOpen(false)} aria-label="Close review form">x</button>
            </div>
            <div className="mt-4 flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button key={value} type="button" onClick={() => setRating(value)} className={`text-3xl ${value <= rating ? 'text-status-warning' : 'text-gray-300'}`}>★</button>
              ))}
            </div>
            <label className="mt-4 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Title</span>
              <input className="input mt-1.5" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short review title" maxLength={150} />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Review</span>
              <textarea className="input mt-1.5 min-h-[130px]" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share your experience with this product" maxLength={5000} />
            </label>
            {message && <p className="mt-3 rounded-lg bg-brand-light p-3 text-sm text-brand-gray">{message}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>{busy ? 'Submitting...' : user ? 'Submit review' : 'Login to submit review'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
