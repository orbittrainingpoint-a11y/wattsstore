'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { RatingStars } from '@/components/ui/RatingStars';

interface Testimonial {
  id: number;
  name: string;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  quote: string;
  rating: number;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
}

function empty(): Partial<Testimonial> {
  return { name: '', role: '', company: '', avatarUrl: '', quote: '', rating: 5, sortOrder: 0, isFeatured: true, isActive: true };
}

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [editor, setEditor] = useState<Partial<Testimonial> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    api.get<Testimonial[]>('/admin/testimonials').then((response) => setItems(response.data)).catch((err) => setMessage((err as Error).message));
  }
  useEffect(load, []);

  async function save() {
    if (!editor?.name || !editor.quote) return;
    const payload = {
      name: editor.name,
      role: editor.role || null,
      company: editor.company || null,
      avatarUrl: editor.avatarUrl || null,
      quote: editor.quote,
      rating: Number(editor.rating ?? 5),
      sortOrder: Number(editor.sortOrder ?? 0),
      isFeatured: editor.isFeatured ?? true,
      isActive: editor.isActive ?? true,
    };
    if (editor.id) await api.put(`/admin/testimonials/${editor.id}`, payload);
    else await api.post('/admin/testimonials', payload);
    setMessage('Testimonial saved.');
    setEditor(null);
    load();
  }

  return (
    <div>
      <header className="mb-5 flex justify-between gap-3">
        <div>
          <div className="section-eyebrow">Content</div>
          <h1 className="mt-1 text-3xl font-extrabold">Testimonials</h1>
          <p className="text-sm text-brand-gray">Manage customer proof shown on the homepage.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditor(empty())}>+ New testimonial</button>
      </header>
      {message && <div className="card p-3 mb-4 text-sm">{message}</div>}
      <div className="grid md:grid-cols-3 gap-4">
        {items.map((item) => (
          <article key={item.id} className="card p-5">
            <RatingStars value={Number(item.rating)} />
            <p className="my-3 text-sm">&ldquo;{item.quote}&rdquo;</p>
            <div className="font-semibold">{item.name}</div>
            <div className="text-xs text-brand-gray">{[item.role, item.company].filter(Boolean).join(', ')}</div>
            <div className="mt-3 flex gap-1">
              <button className="btn-outline btn-sm" onClick={() => setEditor(item)}>Edit</button>
              <button className="btn-ghost btn-sm text-status-error" onClick={async () => { await api.del(`/admin/testimonials/${item.id}`); load(); }}>Delete</button>
            </div>
          </article>
        ))}
      </div>
      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5">
          <div className="card p-6 w-full max-w-xl space-y-3">
            <h2 className="font-extrabold text-xl">{editor.id ? 'Edit testimonial' : 'New testimonial'}</h2>
            <input className="input" placeholder="Author name" value={editor.name ?? ''} onChange={(event) => setEditor({ ...editor, name: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Role" value={editor.role ?? ''} onChange={(event) => setEditor({ ...editor, role: event.target.value })} />
              <input className="input" placeholder="Company" value={editor.company ?? ''} onChange={(event) => setEditor({ ...editor, company: event.target.value })} />
            </div>
            <ImagePicker value={editor.avatarUrl} folder="testimonials" onSelect={(url) => setEditor({ ...editor, avatarUrl: url })} label="Select avatar" />
            <textarea className="input min-h-[120px]" placeholder="Quote" value={editor.quote ?? ''} onChange={(event) => setEditor({ ...editor, quote: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="number" min={1} max={5} step={0.1} value={editor.rating ?? 5} onChange={(event) => setEditor({ ...editor, rating: Number(event.target.value) })} />
              <input className="input" type="number" value={editor.sortOrder ?? 0} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} />
            </div>
            <div className="flex gap-4 text-sm">
              <label><input type="checkbox" checked={editor.isActive ?? true} onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })} /> Active</label>
              <label><input type="checkbox" checked={editor.isFeatured ?? true} onChange={(event) => setEditor({ ...editor, isFeatured: event.target.checked })} /> Featured</label>
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEditor(null)}>Cancel</button><button className="btn-primary" onClick={() => void save()}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
