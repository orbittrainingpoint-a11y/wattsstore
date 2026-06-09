'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ImagePicker } from '@/components/admin/ImagePicker';

interface Banner {
  id: number;
  placement: string;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
  tone: string | null;
  countryIds: number[];
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const PLACEMENTS = [
  { v: 'home_mosaic', label: 'Home - Mosaic tiles', tone: 'bg-brand-blue/10 text-brand-blue' },
  { v: 'home_promo', label: 'Home - Promo pair', tone: 'bg-emerald-50 text-emerald-700' },
  { v: 'about_cta', label: 'About - CTA', tone: 'bg-cyan-50 text-cyan-700' },
  { v: 'home_hero',  label: 'Home — Hero slider', tone: 'bg-brand-blue/10 text-brand-blue' },
  { v: 'home_strip', label: 'Home — Segment strip', tone: 'bg-emerald-50 text-emerald-700' },
  { v: 'category',   label: 'Category page',       tone: 'bg-violet-50 text-violet-700' },
  { v: 'sidebar',    label: 'Sidebar promo',       tone: 'bg-amber-50 text-amber-700' },
  { v: 'pdp',        label: 'Product page',        tone: 'bg-rose-50 text-rose-700' },
  { v: 'promo',      label: 'Promo strip',         tone: 'bg-cyan-50 text-cyan-700' },
];

const TONES = ['blue', 'mint', 'violet', 'yellow', 'dark'];

function emptyBanner(): Partial<Banner> {
  return {
    placement: 'home_hero',
    eyebrow: '',
    title: '',
    subtitle: '',
    imageUrl: '',
    mobileImageUrl: '',
    linkUrl: '',
    ctaLabel: '',
    tone: 'blue',
    countryIds: [],
    sortOrder: 0,
    isActive: true,
  };
}

export default function AdminBannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [placement, setPlacement] = useState<string>('');
  const [editor, setEditor] = useState<Partial<Banner> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setBusy(true);
    const qs = placement ? `?placement=${placement}` : '';
    api.get<Banner[]>(`/admin/banners${qs}`)
      .then((r) => setItems(r.data))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setBusy(false));
  }
  useEffect(load, [placement]);

  async function save() {
    if (!editor) return;
    if (!editor.imageUrl) { setErr('Image URL is required.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        placement: editor.placement!,
        eyebrow: editor.eyebrow || null,
        title: editor.title || null,
        subtitle: editor.subtitle || null,
        imageUrl: editor.imageUrl!,
        mobileImageUrl: editor.mobileImageUrl || null,
        linkUrl: editor.linkUrl || null,
        ctaLabel: editor.ctaLabel || null,
        tone: editor.tone || null,
        countryIds: editor.countryIds ?? [],
        sortOrder: editor.sortOrder ?? 0,
        isActive: editor.isActive ?? true,
      };
      if (editor.id) {
        await api.put(`/admin/banners/${editor.id}`, payload);
        setMsg('Banner updated');
      } else {
        await api.post('/admin/banners', payload);
        setMsg('Banner created');
      }
      setEditor(null);
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function del(id: number, title: string | null) {
    if (!confirm(`Delete banner "${title || `#${id}`}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.del(`/admin/banners/${id}`);
      setMsg('Banner deleted');
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function toggle(b: Banner) {
    setBusy(true);
    try {
      await api.put(`/admin/banners/${b.id}`, { isActive: !b.isActive });
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function move(b: Banner, delta: -1 | 1) {
    setBusy(true);
    try {
      await api.put(`/admin/banners/${b.id}`, { sortOrder: Math.max(0, (b.sortOrder ?? 0) + delta) });
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Marketing</div>
          <h1 className="mt-1 text-3xl font-extrabold">Banners</h1>
          <p className="text-sm text-brand-gray">Create, edit, schedule, and delete the visuals that drive the site.</p>
        </div>
        <button onClick={() => setEditor(emptyBanner())} className="btn-primary">+ New banner</button>
      </header>

      {msg && <div className="card p-3 mb-3 text-sm bg-status-success/10 text-status-success">✓ {msg}</div>}
      {err && <div className="card p-3 mb-3 text-sm bg-status-error/10 text-status-error">⚠ {err}</div>}

      {/* Placement filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setPlacement('')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placement === '' ? 'bg-brand-blue text-white' : 'bg-white border border-gray-200 text-brand-gray hover:border-brand-blue'}`}>All ({items.length})</button>
        {PLACEMENTS.map((p) => (
          <button key={p.v} onClick={() => setPlacement(p.v)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${placement === p.v ? 'bg-brand-blue text-white' : p.tone + ' hover:opacity-80'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {busy && items.length === 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-48 animate-pulse bg-gray-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl">🖼</div>
          <p className="mt-3 font-semibold">No banners yet</p>
          <p className="text-sm text-brand-gray">Click "+ New banner" to create one.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((b) => (
            <div key={b.id} className="card overflow-hidden">
              <div className="aspect-[16/9] bg-brand-light overflow-hidden relative">
                {b.imageUrl ? <img src={b.imageUrl} alt={b.title ?? ''} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-brand-gray text-xs">No image</div>}
                <span className={`absolute top-2 left-2 badge ${b.isActive ? 'badge-success' : 'badge bg-gray-200 text-brand-gray'}`}>{b.isActive ? 'Live' : 'Paused'}</span>
                <span className="absolute top-2 right-2 badge bg-white/90 text-brand-blue">{PLACEMENTS.find((p) => p.v === b.placement)?.label.split(' — ')[1] ?? b.placement}</span>
              </div>
              <div className="p-4">
                {b.eyebrow && <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-blue">{b.eyebrow}</div>}
                <h3 className="mt-1 font-extrabold line-clamp-1">{b.title || <span className="text-brand-gray italic">untitled</span>}</h3>
                {b.subtitle && <p className="text-xs text-brand-gray line-clamp-2 mt-1">{b.subtitle}</p>}
                <div className="mt-2 text-xs text-brand-gray font-mono truncate">{b.linkUrl ?? '—'}</div>
                <div className="mt-1 text-xs text-brand-gray">
                  Sort: <span className="font-mono">{b.sortOrder}</span>
                  {b.startsAt && <> · from {formatDate(b.startsAt)}</>}
                  {b.endsAt && <> · until {formatDate(b.endsAt)}</>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <button onClick={() => setEditor(b)} className="btn-outline btn-sm">Edit</button>
                  <button onClick={() => toggle(b)} className="btn-ghost btn-sm">{b.isActive ? 'Pause' : 'Activate'}</button>
                  <button onClick={() => move(b, -1)} className="btn-ghost btn-sm" disabled={busy} title="Move up">▲</button>
                  <button onClick={() => move(b, +1)} className="btn-ghost btn-sm" disabled={busy} title="Move down">▼</button>
                  <button onClick={() => del(b.id, b.title)} className="btn-ghost btn-sm text-status-error">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor */}
      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white w-full md:max-w-3xl md:rounded-2xl rounded-t-2xl shadow-modal max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{editor.id ? 'Edit' : 'New'}</div>
                <h2 className="font-extrabold text-xl">{editor.id ? `Banner #${editor.id}` : 'New banner'}</h2>
              </div>
              <button onClick={() => setEditor(null)} className="text-brand-gray hover:text-brand-dark text-2xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Live preview */}
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="aspect-[16/6] bg-brand-light relative">
                  {editor.imageUrl ? <img src={editor.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-brand-gray text-sm">Image preview will appear here</div>}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-center text-white">
                    {editor.eyebrow && <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-brand-yellow">{editor.eyebrow}</div>}
                    {editor.title && <div className="mt-1 text-2xl md:text-3xl font-extrabold drop-shadow">{editor.title}</div>}
                    {editor.subtitle && <div className="mt-1 text-sm text-white/85 max-w-md">{editor.subtitle}</div>}
                    {editor.ctaLabel && <div className="mt-3"><span className="btn-yellow btn-sm pointer-events-none">{editor.ctaLabel} →</span></div>}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Placement *</span>
                  <select className="input mt-1" value={editor.placement} onChange={(e) => setEditor({ ...editor, placement: e.target.value })}>
                    {PLACEMENTS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Tone</span>
                  <select className="input mt-1" value={editor.tone ?? ''} onChange={(e) => setEditor({ ...editor, tone: e.target.value || null })}>
                    <option value="">— none —</option>
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Image URL *</span>
                <input className="input mt-1" placeholder="https://… or /img/banners/yours.svg" value={editor.imageUrl ?? ''} onChange={(e) => setEditor({ ...editor, imageUrl: e.target.value })} />
              </label>
              <ImagePicker value={editor.imageUrl} folder="banners" onSelect={(url) => setEditor({ ...editor, imageUrl: url })} />
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Mobile image URL <span className="font-normal lowercase text-brand-gray">(optional, defaults to image)</span></span>
                <input className="input mt-1" placeholder="https://…" value={editor.mobileImageUrl ?? ''} onChange={(e) => setEditor({ ...editor, mobileImageUrl: e.target.value })} />
              </label>
              <ImagePicker value={editor.mobileImageUrl ?? null} folder="banners" onSelect={(url) => setEditor({ ...editor, mobileImageUrl: url })} />

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Eyebrow <span className="font-normal lowercase text-brand-gray">(small chip above title)</span></span>
                <input className="input mt-1" value={editor.eyebrow ?? ''} onChange={(e) => setEditor({ ...editor, eyebrow: e.target.value })} maxLength={80} />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Title</span>
                <input className="input mt-1" value={editor.title ?? ''} onChange={(e) => setEditor({ ...editor, title: e.target.value })} maxLength={150} />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Subtitle</span>
                <textarea className="input mt-1 min-h-[80px]" value={editor.subtitle ?? ''} onChange={(e) => setEditor({ ...editor, subtitle: e.target.value })} maxLength={255} />
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">CTA label</span>
                  <input className="input mt-1" placeholder="Shop now" value={editor.ctaLabel ?? ''} onChange={(e) => setEditor({ ...editor, ctaLabel: e.target.value })} maxLength={60} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Click destination URL</span>
                  <input className="input mt-1" placeholder="/ae/categories/industrial-lighting" value={editor.linkUrl ?? ''} onChange={(e) => setEditor({ ...editor, linkUrl: e.target.value })} maxLength={500} />
                </label>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Sort order</span>
                  <input type="number" className="input mt-1" value={editor.sortOrder ?? 0} onChange={(e) => setEditor({ ...editor, sortOrder: Number(e.target.value) })} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Starts at</span>
                  <input type="datetime-local" className="input mt-1" value={editor.startsAt ? new Date(editor.startsAt).toISOString().slice(0, 16) : ''} onChange={(e) => setEditor({ ...editor, startsAt: e.target.value || null })} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Ends at</span>
                  <input type="datetime-local" className="input mt-1" value={editor.endsAt ? new Date(editor.endsAt).toISOString().slice(0, 16) : ''} onChange={(e) => setEditor({ ...editor, endsAt: e.target.value || null })} />
                </label>
              </div>

              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editor.isActive ?? true} onChange={(e) => setEditor({ ...editor, isActive: e.target.checked })} />
                <span className="text-sm">Active (visible to customers)</span>
              </label>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setEditor(null)} className="btn-outline">Cancel</button>
              <button onClick={save} className="btn-primary" disabled={busy}>{busy ? 'Saving…' : (editor.id ? 'Save changes' : 'Create banner')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
