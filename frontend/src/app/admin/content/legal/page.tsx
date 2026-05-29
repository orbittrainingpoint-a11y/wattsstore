'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ImagePicker } from '@/components/admin/ImagePicker';

interface LegalSection { heading: string; paragraphs: string[] }
interface LegalPage {
  id: number;
  slug: string;
  title: string;
  intro: string | null;
  heroImageUrl: string | null;
  sections: LegalSection[];
  updatedLabel: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
  updatedAt: string;
}

function emptyPage(): Partial<LegalPage> {
  return {
    slug: '',
    title: '',
    intro: '',
    sections: [{ heading: 'Section 1', paragraphs: [''] }],
    updatedLabel: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    isPublished: true,
  };
}

const SUGGESTED = [
  { slug: 'privacy-policy', title: 'Privacy Policy' },
  { slug: 'terms-of-service', title: 'Terms of Service' },
  { slug: 'returns-policy', title: 'Returns Policy' },
  { slug: 'shipping-policy', title: 'Shipping Policy' },
  { slug: 'cookie-policy', title: 'Cookie Policy' },
  { slug: 'warranty-policy', title: 'Warranty Policy' },
];

export default function AdminLegalPages() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [editor, setEditor] = useState<Partial<LegalPage> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setBusy(true);
    api.get<LegalPage[]>('/admin/legal')
      .then((r) => setPages(r.data))
      .catch((e) => setErr((e as Error).message))
      .finally(() => setBusy(false));
  }
  useEffect(load, []);

  async function save() {
    if (!editor || !editor.slug || !editor.title) { setErr('Slug and title are required.'); return; }
    if (!editor.sections || editor.sections.length === 0) { setErr('At least one section is required.'); return; }
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        slug: editor.slug,
        title: editor.title,
        intro: editor.intro || null,
        heroImageUrl: editor.heroImageUrl || null,
        sections: editor.sections,
        updatedLabel: editor.updatedLabel || null,
        metaTitle: editor.metaTitle || null,
        metaDescription: editor.metaDescription || null,
        isPublished: editor.isPublished ?? true,
      };
      if (editor.id) {
        await api.put(`/admin/legal/${editor.id}`, payload);
        setMsg('Legal page updated');
      } else {
        await api.post('/admin/legal', payload);
        setMsg('Legal page created');
      }
      setEditor(null);
      load();
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  async function del(id: number, slug: string) {
    if (!confirm(`Delete legal page "${slug}"? Customers will no longer see it.`)) return;
    setBusy(true);
    try { await api.del(`/admin/legal/${id}`); setMsg('Legal page deleted'); load(); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  function setSection(idx: number, patch: Partial<LegalSection>) {
    if (!editor?.sections) return;
    const next = [...editor.sections];
    next[idx] = { ...next[idx], ...patch };
    setEditor({ ...editor, sections: next });
  }
  function setParagraph(secIdx: number, pIdx: number, text: string) {
    if (!editor?.sections) return;
    const next = [...editor.sections];
    const paras = [...next[secIdx].paragraphs];
    paras[pIdx] = text;
    next[secIdx] = { ...next[secIdx], paragraphs: paras };
    setEditor({ ...editor, sections: next });
  }
  function addParagraph(secIdx: number) {
    if (!editor?.sections) return;
    const next = [...editor.sections];
    next[secIdx] = { ...next[secIdx], paragraphs: [...next[secIdx].paragraphs, ''] };
    setEditor({ ...editor, sections: next });
  }
  function removeParagraph(secIdx: number, pIdx: number) {
    if (!editor?.sections) return;
    const next = [...editor.sections];
    next[secIdx] = { ...next[secIdx], paragraphs: next[secIdx].paragraphs.filter((_, i) => i !== pIdx) };
    setEditor({ ...editor, sections: next });
  }
  function addSection() {
    setEditor({
      ...editor,
      sections: [...(editor?.sections ?? []), { heading: `Section ${(editor?.sections?.length ?? 0) + 1}`, paragraphs: [''] }],
    });
  }
  function removeSection(idx: number) {
    if (!editor?.sections) return;
    setEditor({ ...editor, sections: editor.sections.filter((_, i) => i !== idx) });
  }
  function moveSection(idx: number, delta: -1 | 1) {
    if (!editor?.sections) return;
    const next = [...editor.sections];
    const j = idx + delta;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setEditor({ ...editor, sections: next });
  }

  function startFromTemplate(t: { slug: string; title: string }) {
    setEditor({ ...emptyPage(), slug: t.slug, title: t.title });
  }

  const existingSlugs = new Set(pages.map((p) => p.slug));

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Content</div>
          <h1 className="mt-1 text-3xl font-extrabold">Legal pages</h1>
          <p className="text-sm text-brand-gray">Privacy, Terms, Returns, Shipping — fully editable. Sections + paragraphs render on the public site.</p>
        </div>
        <button onClick={() => setEditor(emptyPage())} className="btn-primary">+ New page</button>
      </header>

      {msg && <div className="card p-3 mb-3 text-sm bg-status-success/10 text-status-success">✓ {msg}</div>}
      {err && <div className="card p-3 mb-3 text-sm bg-status-error/10 text-status-error">⚠ {err}</div>}

      {/* Suggested templates for missing standard pages */}
      <div className="mb-4 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {SUGGESTED.filter((s) => !existingSlugs.has(s.slug)).map((t) => (
          <button key={t.slug} onClick={() => startFromTemplate(t)} className="card p-3 text-left hover:shadow-modal transition">
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-brand-blue">Suggested</div>
            <div className="mt-1 font-bold">{t.title}</div>
            <div className="text-xs text-brand-gray font-mono">/{t.slug}</div>
            <div className="mt-2 text-xs text-brand-blue">+ Create</div>
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {pages.length === 0 ? (
          <div className="p-10 text-center text-brand-gray">No legal pages yet. Use a template above or click "+ New page".</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray bg-brand-light">
              <tr>
                <th className="p-3 font-bold">Slug</th>
                <th className="p-3 font-bold">Title</th>
                <th className="p-3 font-bold">Sections</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Updated</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  <td className="p-3 font-mono text-brand-blue">/{p.slug}</td>
                  <td className="p-3 font-semibold">{p.title}</td>
                  <td className="p-3"><span className="badge bg-brand-blue/10 text-brand-blue">{(p.sections ?? []).length}</span></td>
                  <td className="p-3"><span className={`badge ${p.isPublished ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{p.isPublished ? 'Live' : 'Draft'}</span></td>
                  <td className="p-3 text-xs">{formatDate(p.updatedAt)}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setEditor(p)} className="btn-outline btn-sm mr-1">Edit</button>
                    <button onClick={() => del(p.id, p.slug)} className="btn-ghost btn-sm text-status-error">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-white w-full md:max-w-4xl md:rounded-2xl rounded-t-2xl shadow-modal max-h-[92vh] overflow-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-brand-gray font-bold">{editor.id ? 'Edit' : 'New'}</div>
                <h2 className="font-extrabold text-xl">{editor.title || 'Legal page'}</h2>
              </div>
              <button onClick={() => setEditor(null)} className="text-brand-gray hover:text-brand-dark text-2xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Slug *</span>
                  <input className="input mt-1 font-mono" value={editor.slug ?? ''} onChange={(e) => setEditor({ ...editor, slug: e.target.value.toLowerCase() })} placeholder="privacy-policy" maxLength={60} />
                  <span className="text-[10px] text-brand-gray">Lowercase letters, digits, hyphens only. URL: /[country]/{editor.slug || 'slug'}</span>
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Title *</span>
                  <input className="input mt-1" value={editor.title ?? ''} onChange={(e) => setEditor({ ...editor, title: e.target.value })} maxLength={150} />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Intro paragraph</span>
                <textarea className="input mt-1 min-h-[80px]" value={editor.intro ?? ''} onChange={(e) => setEditor({ ...editor, intro: e.target.value })} maxLength={2000} />
              </label>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-brand-gray mb-2">Hero image</div>
                <ImagePicker value={editor.heroImageUrl} folder="legal" onSelect={(url) => setEditor({ ...editor, heroImageUrl: url })} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">Updated label</span>
                  <input className="input mt-1" placeholder="May 2026" value={editor.updatedLabel ?? ''} onChange={(e) => setEditor({ ...editor, updatedLabel: e.target.value })} maxLength={40} />
                </label>
                <label className="flex items-center gap-2 sm:mt-7">
                  <input type="checkbox" checked={editor.isPublished ?? true} onChange={(e) => setEditor({ ...editor, isPublished: e.target.checked })} />
                  <span className="text-sm">Published (visible to customers)</span>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">SEO meta title</span>
                  <input className="input mt-1" value={editor.metaTitle ?? ''} onChange={(e) => setEditor({ ...editor, metaTitle: e.target.value })} maxLength={255} />
                </label>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-gray">SEO meta description</span>
                  <input className="input mt-1" value={editor.metaDescription ?? ''} onChange={(e) => setEditor({ ...editor, metaDescription: e.target.value })} maxLength={500} />
                </label>
              </div>

              <hr className="border-gray-100" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold">Sections ({editor.sections?.length ?? 0})</h3>
                  <button onClick={addSection} className="btn-outline btn-sm">+ Add section</button>
                </div>
                <div className="space-y-3">
                  {(editor.sections ?? []).map((s, idx) => (
                    <div key={idx} className="card p-4 bg-brand-light">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          className="input flex-1 !bg-white"
                          placeholder="Section heading"
                          value={s.heading}
                          onChange={(e) => setSection(idx, { heading: e.target.value })}
                          maxLength={200}
                        />
                        <button onClick={() => moveSection(idx, -1)} className="btn-ghost btn-sm" disabled={idx === 0}>▲</button>
                        <button onClick={() => moveSection(idx, +1)} className="btn-ghost btn-sm" disabled={idx === (editor.sections?.length ?? 0) - 1}>▼</button>
                        <button onClick={() => removeSection(idx)} className="btn-ghost btn-sm text-status-error">Remove</button>
                      </div>
                      <div className="space-y-2">
                        {s.paragraphs.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2">
                            <textarea
                              className="input flex-1 !bg-white min-h-[60px]"
                              placeholder="Paragraph…"
                              value={p}
                              onChange={(e) => setParagraph(idx, pIdx, e.target.value)}
                            />
                            <button onClick={() => removeParagraph(idx, pIdx)} className="btn-ghost btn-sm text-status-error" disabled={s.paragraphs.length <= 1}>×</button>
                          </div>
                        ))}
                        <button onClick={() => addParagraph(idx)} className="text-xs text-brand-blue hover:underline">+ Add paragraph</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setEditor(null)} className="btn-outline">Cancel</button>
              <button onClick={save} className="btn-primary" disabled={busy}>{busy ? 'Saving…' : (editor.id ? 'Save changes' : 'Create page')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
