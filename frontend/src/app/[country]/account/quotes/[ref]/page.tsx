'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useRouteParams } from '@/lib/useRouteParams';

interface QuoteItem { id: number; productTitle: string; variantSku: string; targetQuantity: number; customerRemarks: string | null; offeredUnitPrice: number | null; offeredSubtotal: number | null }
interface QuoteDetail {
  id: number; quoteRefNumber: string; quoteStatus: string;
  companyName: string; contactName: string; contactEmail: string; deliveryLocation: string; urgencyLevel: string;
  totalOfferedValue: number | null; currencyCode: string;
  invoiceUrl: string | null; invoiceSentAt: string | null; expiresAt: string | null;
  createdAt: string;
  items: QuoteItem[];
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}
interface QuoteMessage { id: number; senderRole: string; message: string; createdAt: string; sender?: { firstName: string; lastName: string; role: string } | null }

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

export default function QuoteDetailPage({ params }: { params: Promise<{ country: string; ref: string }> }) {
  const { country: region, ref } = useRouteParams(params);
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [chatText, setChatText] = useState('');

  useEffect(() => { if (!isLoading && !user) router.push('/auth/login'); }, [isLoading, user, router]);
  function loadQuote() {
    if (user) void api.get<QuoteDetail>(`/quotes/${ref}`, { country: region })
      .then((r) => setQuote(r.data))
      .catch((e) => setErr((e as Error).message));
    if (user) void api.get<QuoteMessage[]>(`/quotes/${ref}/messages`, { country: region })
      .then((r) => setMessages(r.data))
      .catch(() => setMessages([]));
  }
  useEffect(loadQuote, [user, region, ref]);

  async function acceptQuote() {
    setBusy(true);
    setErr(null);
    try {
      const response = await api.post<{ orderNumber: string }>(`/quotes/${ref}/accept`, undefined, { country: region });
      setMsg(`Quotation accepted. Order ${response.data.orderNumber} has been created for payment processing.`);
      loadQuote();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function rejectQuote() {
    if (!rejectReason.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/quotes/${ref}/reject`, { reason: rejectReason.trim() }, { country: region });
      setMsg('Quotation declined. The sales team can see your reason.');
      loadQuote();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!chatText.trim()) return;
    setBusy(true);
    try {
      await api.post(`/quotes/${ref}/messages`, { message: chatText.trim() }, { country: region });
      setChatText('');
      loadQuote();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!quote && !err) return <div className="container-ws py-16 text-center text-sm text-brand-gray">Loading…</div>;
  if (err || !quote) return <div className="container-ws py-16 text-center text-status-error">{err}</div>;

  return (
    <div className="container-ws py-8 md:py-10">
      <Breadcrumb items={[{ label: 'Home', href: `/${region}` }, { label: 'Account', href: `/${region}/account` }, { label: 'Quotes', href: `/${region}/account/quotes` }, { label: quote.quoteRefNumber }]} />

      <header className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Quote</div>
          <h1 className="mt-1 text-3xl font-extrabold font-mono">{quote.quoteRefNumber}</h1>
          <p className="text-sm text-brand-gray">{quote.companyName} · Submitted {formatDate(quote.createdAt)}</p>
        </div>
        <span className={STATUS_TONE[quote.quoteStatus] ?? 'badge bg-gray-100'}>{quote.quoteStatus.replace(/_/g, ' ')}</span>
      </header>
      {msg && <div className="card p-4 mb-4 text-sm bg-status-success/10 text-status-success">{msg}</div>}
      {err && <div className="card p-4 mb-4 text-sm bg-status-error/10 text-status-error">{err}</div>}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          {/* Items + pricing */}
          <section className="card overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 bg-brand-blue/5">
              <h2 className="font-extrabold">Line items ({quote.items.length})</h2>
            </header>
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-[0.18em] text-brand-gray">
                <tr><th className="text-left p-3 font-bold">Product</th><th className="p-3 font-bold">Qty</th><th className="p-3 font-bold text-right">Unit</th><th className="p-3 font-bold text-right">Subtotal</th></tr>
              </thead>
              <tbody>
                {quote.items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="p-3">
                      <div className="font-medium line-clamp-1">{it.productTitle}</div>
                      <div className="text-xs font-mono text-brand-gray">{it.variantSku}</div>
                      {it.customerRemarks && <div className="text-xs text-brand-gray italic mt-0.5">Note: {it.customerRemarks}</div>}
                    </td>
                    <td className="p-3 text-center font-mono">{it.targetQuantity}</td>
                    <td className="p-3 text-right font-mono">{it.offeredUnitPrice != null ? formatCurrency(it.offeredUnitPrice, quote.currencyCode) : <span className="text-brand-gray">pending</span>}</td>
                    <td className="p-3 text-right font-mono font-semibold">{it.offeredSubtotal != null ? formatCurrency(it.offeredSubtotal, quote.currencyCode) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-brand-light">
                  <td colSpan={3} className="p-3 text-right font-bold">Total offered</td>
                  <td className="p-3 text-right font-mono font-extrabold text-brand-blue">{quote.totalOfferedValue ? formatCurrency(quote.totalOfferedValue, quote.currencyCode) : '—'}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          {quote.invoiceUrl && (
            <section className="card p-5 flex items-center gap-3">
              <div className="text-3xl">📄</div>
              <div className="flex-1">
                <div className="font-semibold">PDF invoice ready</div>
                <div className="text-xs text-brand-gray">Sent on {quote.invoiceSentAt ? formatDate(quote.invoiceSentAt) : 'recently'}</div>
              </div>
              <a href={`/api/v1/quotes/${quote.quoteRefNumber}/download`} className="btn-primary btn-sm" target="_blank" rel="noreferrer">Download</a>
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-extrabold">Chat with sales</h2>
            <p className="mt-1 text-sm text-brand-gray">Ask about delivery, pricing, substitutions or technical documents for this RFQ.</p>
            <div className="mt-4 max-h-72 space-y-3 overflow-auto rounded-xl bg-brand-light p-3">
              {messages.length === 0 && <div className="text-sm text-brand-gray">No messages yet. Start the conversation below.</div>}
              {messages.map((item) => (
                <div key={item.id} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                  <div className="mb-1 flex justify-between gap-2 text-xs text-brand-gray">
                    <span className="font-bold capitalize">{item.senderRole}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{item.message}</div>
                </div>
              ))}
            </div>
            <textarea className="input mt-3 min-h-[90px]" placeholder="Write a message to the sales team..." value={chatText} onChange={(event) => setChatText(event.target.value)} />
            <div className="mt-3 flex justify-end">
              <button className="btn-primary btn-sm" disabled={busy || !chatText.trim()} onClick={() => void sendMessage()}>Send message</button>
            </div>
          </section>

          {quote.quoteStatus === 'invoice_sent' && (
            <section className="card p-5 space-y-4">
              <div>
                <h2 className="font-extrabold">Respond to quotation</h2>
                <p className="mt-1 text-sm text-brand-gray">Accept to create an order for payment processing, or decline with a reason for the sales desk.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" disabled={busy} onClick={() => void acceptQuote()}>Accept quotation</button>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase text-brand-gray">Reason for declining</span>
                <textarea className="input mt-1 min-h-[80px]" maxLength={500} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
              </label>
              <button className="btn-outline" disabled={busy || !rejectReason.trim()} onClick={() => void rejectQuote()}>Decline quotation</button>
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Status history</h2>
            <ol className="space-y-3 text-sm">
              {quote.statusHistory.map((h, i) => (
                <li key={i} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-brand-blue mt-2" />
                  <div>
                    <div className="font-semibold">{h.status.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-brand-gray">{formatDate(h.createdAt)}{h.note ? ` · ${h.note}` : ''}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Delivery</h3>
            <div className="text-sm whitespace-pre-wrap">{quote.deliveryLocation}</div>
            <div className="mt-2 text-xs text-brand-gray">Urgency: {quote.urgencyLevel.replace(/_/g, ' ')}</div>
          </div>
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Contact</h3>
            <div className="text-sm">{quote.contactName}</div>
            <div className="text-xs text-brand-gray">{quote.contactEmail}</div>
          </div>
          <Link href={`/${region}/contact`} className="btn-outline w-full">Talk to the assigned agent</Link>
        </aside>
      </div>
    </div>
  );
}
