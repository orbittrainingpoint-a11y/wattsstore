'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useRouteParams } from '@/lib/useRouteParams';

interface Quote { quoteRefNumber: string; quoteStatus: string; companyName: string; currencyCode: string; totalOfferedValue: number | null; createdAt: string; _count: { items: number } }

const STATUS_TONE: Record<string, string> = {
  submitted: 'badge-warning',
  under_review: 'badge-blue',
  offered: 'badge bg-[#4cc9f0]/20 text-[#0f5a8a]',
  quotation_generating: 'badge-blue',
  invoice_sent: 'badge-success',
  delivery_failed: 'badge-error',
  accepted: 'badge-success',
  rejected: 'badge-error',
  expired: 'badge bg-gray-100 text-brand-gray',
};

export default function QuotesPage({ params }: { params: Promise<{ country: string }> }) {
  const region = useRouteParams(params).country;
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [list, setList] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  useEffect(() => {
    if (user) {
      api.get<Quote[]>('/quotes', { country: region }).then((r) => setList(r.data)).catch(() => setList([])).finally(() => setLoading(false));
      // Clear quote-message notification badge
      api.put('/account/notifications/read-all').catch(() => undefined);
    }
  }, [user, region]);

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'My Quotes' }]} />
      <header className="mt-4 mb-6"><div className="section-eyebrow">B2B</div><h1 className="mt-1 text-3xl font-extrabold">My quotes</h1></header>

      {loading ? (
        <div className="card p-12 text-center text-sm text-brand-gray">Loading…</div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl">📋</div>
          <p className="mt-3 font-semibold">No quotes yet</p>
          <p className="mt-1 text-sm text-brand-gray">Submit your first RFQ to start receiving negotiated B2B pricing.</p>
          <Link href={`/${region}/quote-basket`} className="btn-primary mt-5 inline-flex">Submit RFQ</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {list.map((q) => (
            <Link href={`/${region}/account/quotes/${q.quoteRefNumber}`} key={q.quoteRefNumber} className="card card-hover p-5 grid grid-cols-2 md:grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4">
              <div>
                <div className="font-mono font-bold text-brand-blue">{q.quoteRefNumber}</div>
                <div className="text-xs text-brand-gray">{q.companyName} · {formatDate(q.createdAt)}</div>
              </div>
              <div className="text-sm">
                <div className="text-brand-gray text-xs">Items</div>
                <div className="font-semibold">{q._count.items}</div>
              </div>
              <div className="text-sm hidden md:block">
                <div className="text-brand-gray text-xs">Offered</div>
                <div className="font-mono font-bold">{q.totalOfferedValue ? formatCurrency(q.totalOfferedValue, q.currencyCode) : '—'}</div>
              </div>
              <div className="hidden md:block"><span className={STATUS_TONE[q.quoteStatus] ?? 'badge bg-gray-100'}>{q.quoteStatus.replace(/_/g, ' ')}</span></div>
              <div className="text-right text-sm text-brand-blue font-semibold">View →</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
