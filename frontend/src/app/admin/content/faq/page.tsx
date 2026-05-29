'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface FaqEntry {
  id: number;
  categoryName: string | null;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

function emptyFaq(): Partial<FaqEntry> {
  return { categoryName: 'General', question: '', answer: '', sortOrder: 0, isActive: true };
}

export default function AdminFaqPage() {
  const [items, setItems] = useState<FaqEntry[]>([]);
  const [editor, setEditor] = useState<Partial<FaqEntry> | null>(null);
  const [filterCat, setFilterCat] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setBusy(true);
    api.get<FaqEntry[]>('/admin/faq')
      .then((r) => setItems(r.data))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setBusy(false));
  }
  useEffect(load, []);

  const categories = Array.from(new Set(items.map((i) => i.categoryName ?? 'General').filter(Boolean)));
  const visible = filterCat ? items.filter((i) => (i.categoryName ?? 'General') === filterCat) : items;

  async function save() {
    if (!editor) return;
    if (!editor.question?.trim() || !editor.answer?.trim()) { setErr('Question and answer are required.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        categoryName: editor.categoryName?.trim() || 'General',
        question: editor.question.trim(),
        answer: editor.answer.trim(),
        sortOrder: editor.sortOrder ?? 0,
        isActive: editor.isActive ?? true,
      };
      if (editor.id) {
        await api.put(`/admin/faq/${editor.id}`, payload);
        setMsg('FAQ updated');
      } else {
        await api.post('/admin/faq', payload);
        setMsg('FAQ created');
      }
      setEditor(null);
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function del(id: number, q: string) {
    if (!confirm(`Delete: "${q.slice(0, 60)}…"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.del(`/admin/faq/${id}`);
      setMsg('FAQ deleted');
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function toggle(f: FaqEntry) {
    setBusy(true);
    try { await api.put(`/admin/faq/${f.id}`, { isActive: !f.isActive }); load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function move(f: FaqEntry, delta: -1 | 1) {
    setBusy(true);
    try { await api.put(`/admin/faq/${f.id}`, { sortOrder: Math.max(0, f.sortOrder + delta) }); load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Content</div>
          <h1 className="mt-1 text-3xl font-extrabold">FAQ</h1>
          <p className="text-sm text-brand-gray">Questions customers see on the public FAQ page, grouped by category.</p>
        </div>
        <button onClick={() => setEditor(emptyFaq())} className="btn-primary">+ New FAQ</button>
      </header>

      {msg && <div className="card p-3 mb-3 text-sm bg-status-success/10 text-status-success">✓ {msg}</div>}
      {err && <div className="card p-3 mb-3 text-sm bg-status-error/10 text-status-error">⚠ {err}</div>}

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterCat === '' ? 'bg-brand-blue text-white' : 'bg-white border border-gray-200 text-brand-gray hover:border-brand-blue'}`}>All ({items.length})</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filterCat === c ? 'bg-brand-blue text-white' : 'bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10'}`}>
            {c} ({items.filter((i) => (i.categoryName ?? 'General') === c).length})
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-10 text-center text-brand-gray">No FAQ entries match. Click "+ New FAQ".</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visible.map((f) => (
              <li key={f.id} className="p-5 hover:bg-brand-blue/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge bg-brand-blue/10 text-brand-blue">{f.categoryName ?? 'General'}</span>
                      <span className={`badge ${f.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{f.isActive ? 'Live' : 'Hidden'}</span>
                      <span className="text-xs text-brand-gray">sort: <span className="font-mono">{f.sortOrder}</span></span>
                    </div>
                    <h3 className="font-extrabold">{f.question}</h3>
                    <p className="text-sm text-brand-gray mt-1 whitespace-pre-wrap line-clamp-3">{f.answer}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    <button onClick={() => setEditor(f)} className="btn-outline btn-sm">Edit</button>
                    <button onClick={() => toggle(f)} className="btn-ghost btn-sm">{f.isActive ? 'Hide' : 'Show'}</button>
                    <button onClick={() => move(f, -1)} className="btn-ghost btn-sm" title="Move up">▲</button>
                    <button onClick={() => move(f, +1)} className="btn-ghost btn-sm" title="Move down">▼</button>
                    <button onClick={() => del(f.id, f.question)} className="btn-ghost btn-sm text-status-error">Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white w-full md:max-w-2xl md:rounded-2xl rounded-t-2xl shadow-modal max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{editor.id ? 'Edit' : 'New'}</div>
                <h2 className="font-extrabold text-xl">{editor.id ? `FAQ #${editor.id}` : 'New FAQ entry'}</h2>
              </div>
              <button onClick={() => setEditor(null)} className="text-brand-gray hover:text-brand-dark text-2xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Category</span>
                <input className="input mt-1" placeholder="Orders & Shipping" value={editor.categoryName ?? ''} onChange={(e) => setEditor({ ...editor, categoryName: e.target.value })} list="faq-cats" maxLength={100} />
                <datalist id="faq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Question *</span>
                <input className="input mt-1" value={editor.question ?? ''} onChange={(e) => setEditor({ ...editor, question: e.target.value })} maxLength={500} />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Answer *</span>
                <textarea className="input mt-1 min-h-[160px]" value={editor.answer ?? ''} onChange={(e) => setEditor({ ...editor, answer: e.target.value })} />
              </label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Sort order</span>
                  <input type="number" className="input mt-1" value={editor.sortOrder ?? 0} onChange={(e) => setEditor({ ...editor, sortOrder: Number(e.target.value) })} />
                </label>
                <label className="flex items-center gap-2 sm:mt-7">
                  <input type="checkbox" checked={editor.isActive ?? true} onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })} />
                  <span className="text-sm">Visible to customers</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setEditor(null)} className="btn-outline">Cancel</button>
              <button onClick={save} className="btn-primary" disabled={busy}>{busy ? 'Saving…' : (editor.id ? 'Save changes' : 'Create FAQ')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
