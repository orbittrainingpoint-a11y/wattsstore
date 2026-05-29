'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouteParams } from '@/lib/useRouteParams';

interface QuoteItem { id: number; productTitle: string; variantSku: string; targetQuantity: number; customerRemarks: string | null; offeredUnitPrice: number | null; offeredSubtotal: number | null }
interface QuoteDetail {
  id: number; quoteRefNumber: string; quoteStatus: string;
  companyName: string; contactName: string; contactEmail: string; contactPhone?: string;
  deliveryLocation: string; urgencyLevel: string; additionalNotes?: string;
  trnTaxId?: string;
  totalOfferedValue: number | null; currencyCode: string;
  invoiceUrl: string | null; invoiceSentAt: string | null;
  createdAt: string;
  assignedSalesAgentId?: number;
  items: QuoteItem[];
  statusHistory: { status: string; note: string | null; createdAt: string }[];
}
interface QuoteMessage { id: number; senderRole: string; message: string; isInternal: boolean; createdAt: string; sender?: { firstName: string; lastName: string; role: string } | null }

export default function AdminRfqDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(useRouteParams(params).id);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<QuoteMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [internalNote, setInternalNote] = useState(false);

  function load() {
    api.get<QuoteDetail>(`/sales/quotes/${id}`).then((r) => {
      setQuote(r.data);
      const init: Record<number, string> = {};
      for (const it of r.data.items) init[it.id] = it.offeredUnitPrice != null ? String(it.offeredUnitPrice) : '';
      setPrices(init);
    }).catch((e) => setErr((e as Error).message));
    api.get<QuoteMessage[]>(`/sales/quotes/${id}/messages?includeInternal=true`).then((r) => setMessages(r.data)).catch(() => setMessages([]));
  }
  useEffect(load, [id]);

  async function claim() {
    try { await api.post(`/sales/quotes/${id}/claim`); setMsg('Quote claimed'); load(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function savePrices() {
    try {
      const items = Object.entries(prices)
        .filter(([_, v]) => v !== '')
        .map(([id, v]) => ({ id: Number(id), offeredUnitPrice: Number(v) }));
      await api.put(`/sales/quotes/${id}/items`, { items });
      setMsg('Pricing saved');
      load();
    } catch (e) { setErr((e as Error).message); }
  }
  async function generateInvoice() {
    if (!confirm('Generate & email the invoice? Pricing will be locked.')) return;
    try { await api.post(`/sales/quotes/${id}/invoice`); setMsg('Invoice queued'); load(); }
    catch (e) { setErr((e as Error).message); }
  }
  async function sendMessage() {
    if (!chatText.trim()) return;
    try {
      await api.post(`/sales/quotes/${id}/messages`, { message: chatText.trim(), isInternal: internalNote });
      setChatText('');
      setInternalNote(false);
      load();
    } catch (e) { setErr((e as Error).message); }
  }

  if (!quote && !err) return <div className="text-sm text-brand-gray">Loading…</div>;
  if (err || !quote) return <div className="text-status-error">{err}</div>;

  const locked = ['quotation_generating', 'invoice_sent', 'accepted', 'rejected', 'expired'].includes(quote.quoteStatus);
  const total = Object.entries(prices).reduce((sum, [itemId, v]) => {
    const qty = quote.items.find((i) => i.id === Number(itemId))?.targetQuantity ?? 0;
    return sum + (Number(v) || 0) * qty;
  }, 0);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">RFQ</div>
          <h1 className="mt-1 text-3xl font-extrabold font-mono">{quote.quoteRefNumber}</h1>
          <p className="text-sm text-brand-gray">{quote.companyName} · Submitted {formatDate(quote.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/rfq" className="btn-outline">← Queue</Link>
          {!quote.assignedSalesAgentId && <button className="btn-primary" onClick={claim}>Claim</button>}
        </div>
      </header>

      {msg && <div className="card p-3 mb-4 text-sm rounded-lg bg-status-success/10 text-status-success">✓ {msg}</div>}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 bg-brand-blue/5 flex items-center justify-between">
              <h2 className="font-extrabold">Line items — set offered price</h2>
              {locked && <span className="badge-success">Pricing locked</span>}
            </header>
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-[0.18em] text-brand-gray">
                <tr><th className="text-left p-3 font-bold">Product</th><th className="p-3 font-bold">Qty</th><th className="p-3 font-bold text-right">Unit price ({quote.currencyCode})</th><th className="p-3 font-bold text-right">Subtotal</th></tr>
              </thead>
              <tbody>
                {quote.items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="p-3"><div className="font-medium line-clamp-1">{it.productTitle}</div><div className="text-xs font-mono text-brand-gray">{it.variantSku}</div>{it.customerRemarks && <div className="text-xs text-brand-gray italic">Note: {it.customerRemarks}</div>}</td>
                    <td className="p-3 text-center font-mono">{it.targetQuantity}</td>
                    <td className="p-3 text-right"><input type="number" step="0.01" disabled={locked} value={prices[it.id] ?? ''} onChange={(e) => setPrices({ ...prices, [it.id]: e.target.value })} className="input !py-1.5 !text-right w-28 inline-block font-mono" /></td>
                    <td className="p-3 text-right font-mono font-bold">{formatCurrency((Number(prices[it.id]) || 0) * it.targetQuantity, quote.currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-brand-light">
                  <td colSpan={3} className="p-3 text-right font-bold">Computed total</td>
                  <td className="p-3 text-right font-mono font-extrabold text-brand-blue">{formatCurrency(total, quote.currencyCode)}</td>
                </tr>
              </tfoot>
            </table>
            <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
              <button className="btn-outline" onClick={savePrices} disabled={locked}>Save pricing</button>
              <button className="btn-yellow" onClick={generateInvoice} disabled={!quote.totalOfferedValue || locked}>Generate &amp; send quotation</button>
            </div>
          </section>

          {quote.invoiceUrl && (
            <section className="card p-5 flex items-center gap-3">
              <div className="text-3xl">📄</div>
              <div className="flex-1"><div className="font-semibold">PDF quotation generated</div><div className="text-xs text-brand-gray">Sent {quote.invoiceSentAt ? formatDate(quote.invoiceSentAt) : 'Pending email delivery'}</div></div>
              <a href={`/api/v1/sales/quotes/${quote.id}/download`} className="btn-primary btn-sm" target="_blank" rel="noreferrer">Download</a>
            </section>
          )}

          <section className="card p-5">
            <h2 className="font-extrabold">RFQ conversation</h2>
            <p className="mt-1 text-sm text-brand-gray">Chat with the customer or leave internal sales notes.</p>
            <div className="mt-4 max-h-72 space-y-3 overflow-auto rounded-xl bg-brand-light p-3">
              {messages.length === 0 && <div className="text-sm text-brand-gray">No messages yet.</div>}
              {messages.map((item) => (
                <div key={item.id} className={`rounded-xl bg-white p-3 text-sm shadow-sm ${item.isInternal ? 'border border-amber-200' : ''}`}>
                  <div className="mb-1 flex justify-between gap-2 text-xs text-brand-gray">
                    <span className="font-bold capitalize">{item.isInternal ? 'Internal note' : item.senderRole}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{item.message}</div>
                </div>
              ))}
            </div>
            <textarea className="input mt-3 min-h-[90px]" placeholder="Write a message..." value={chatText} onChange={(event) => setChatText(event.target.value)} />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
                Internal note only
              </label>
              <button className="btn-primary btn-sm" onClick={() => void sendMessage()} disabled={!chatText.trim()}>Send message</button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-extrabold mb-3">Status history</h2>
            <ol className="space-y-2 text-sm">
              {quote.statusHistory.map((h, i) => (
                <li key={i} className="flex gap-3"><div className="h-2 w-2 rounded-full bg-brand-blue mt-2"/><div><div className="font-semibold">{h.status.replace(/_/g, ' ')}</div><div className="text-xs text-brand-gray">{formatDate(h.createdAt)}{h.note ? ` · ${h.note}` : ''}</div></div></li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-3">
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Company</h3>
            <div className="text-sm font-semibold">{quote.companyName}</div>
            {quote.trnTaxId && <div className="text-xs text-brand-gray">TRN: {quote.trnTaxId}</div>}
            <div className="mt-3 text-sm">{quote.contactName}</div>
            <div className="text-xs text-brand-gray">{quote.contactEmail}</div>
            {quote.contactPhone && <div className="text-xs text-brand-gray">{quote.contactPhone}</div>}
          </div>
          <div className="card p-5">
            <h3 className="font-extrabold mb-3">Delivery</h3>
            <div className="text-sm whitespace-pre-wrap">{quote.deliveryLocation}</div>
            <div className="mt-2 text-xs"><span className="badge-warning">Urgency: {quote.urgencyLevel.replace(/_/g, ' ')}</span></div>
          </div>
          {quote.additionalNotes && (
            <div className="card p-5">
              <h3 className="font-extrabold mb-2">Customer notes</h3>
              <p className="text-sm whitespace-pre-wrap">{quote.additionalNotes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
