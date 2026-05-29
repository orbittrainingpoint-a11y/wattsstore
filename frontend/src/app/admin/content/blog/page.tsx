'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ImagePicker } from '@/components/admin/ImagePicker';

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImageUrl: string | null;
  category: string | null;
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  createdAt: string;
}

function emptyPost(): Partial<Post> {
  return { title: '', excerpt: '', body: '', coverImageUrl: '', category: '', status: 'draft' };
}

export default function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [editor, setEditor] = useState<Partial<Post> | null>(null);
  const [bodyMode, setBodyMode] = useState<'text' | 'html'>('text');
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    api.get<Post[]>('/admin/blog').then((response) => setPosts(response.data)).catch((err) => setMessage((err as Error).message));
  }
  useEffect(load, []);

  async function save() {
    if (!editor?.title || !editor.body) return;
    const payload = {
      title: editor.title,
      excerpt: editor.excerpt || undefined,
      body: editor.body,
      coverImageUrl: editor.coverImageUrl || undefined,
      category: editor.category || undefined,
      status: editor.status ?? 'draft',
    };
    if (editor.id) await api.put(`/admin/blog/${editor.id}`, payload);
    else await api.post('/admin/blog', payload);
    setMessage('Blog post saved.');
    setEditor(null);
    load();
  }

  function insertHtml(open: string, close: string) {
    if (!editor) return;
    setEditor({ ...editor, body: `${editor.body ?? ''}${open}Your text${close}` });
    setBodyMode('html');
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><div className="section-eyebrow">Content</div><h1 className="mt-1 text-3xl font-extrabold">Blog posts</h1></div>
        <button className="btn-primary" onClick={() => setEditor(emptyPost())}>+ New post</button>
      </header>
      {message && <div className="card p-3 mb-4 text-sm">{message}</div>}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-left"><tr><th className="p-3">Post</th><th className="p-3">Category</th><th className="p-3">Status</th><th className="p-3">Date</th><th /></tr></thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-t border-gray-100">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {post.coverImageUrl && <img src={post.coverImageUrl} alt="" className="h-10 w-14 rounded object-cover" />}
                    <div><div className="font-semibold">{post.title}</div><div className="font-mono text-xs text-brand-gray">/{post.slug}</div></div>
                  </div>
                </td>
                <td className="p-3">{post.category ?? '-'}</td>
                <td className="p-3"><span className={post.status === 'published' ? 'badge-success' : 'badge-warning'}>{post.status}</span></td>
                <td className="p-3 text-xs">{formatDate(post.publishedAt ?? post.createdAt)}</td>
                <td className="p-3 text-right">
                  <button className="btn-outline btn-sm" onClick={() => { setEditor(post); setBodyMode(/<[^>]+>/.test(post.body) ? 'html' : 'text'); }}>Edit</button>
                  <button className="btn-ghost btn-sm text-status-error" onClick={async () => { await api.del(`/admin/blog/${post.id}`); load(); }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5">
          <div className="card p-6 w-full max-w-2xl max-h-[92vh] overflow-auto space-y-3">
            <h2 className="text-xl font-extrabold">{editor.id ? 'Edit post' : 'New post'}</h2>
            <input className="input" placeholder="Title" value={editor.title ?? ''} onChange={(event) => setEditor({ ...editor, title: event.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Category" value={editor.category ?? ''} onChange={(event) => setEditor({ ...editor, category: event.target.value })} />
              <select className="input" value={editor.status ?? 'draft'} onChange={(event) => setEditor({ ...editor, status: event.target.value as Post['status'] })}>
                <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
              </select>
            </div>
            <ImagePicker value={editor.coverImageUrl} folder="blog" onSelect={(url) => setEditor({ ...editor, coverImageUrl: url })} label="Choose cover image" />
            <textarea className="input min-h-[70px]" placeholder="Excerpt" value={editor.excerpt ?? ''} onChange={(event) => setEditor({ ...editor, excerpt: event.target.value })} />
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button type="button" className={`btn-sm ${bodyMode === 'text' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBodyMode('text')}>Text</button>
                  <button type="button" className={`btn-sm ${bodyMode === 'html' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setBodyMode('html')}>HTML</button>
                </div>
                {bodyMode === 'html' && (
                  <div className="flex gap-1">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => insertHtml('<h2>', '</h2>')}>H2</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => insertHtml('<p>', '</p>')}>P</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => insertHtml('<ul><li>', '</li></ul>')}>List</button>
                  </div>
                )}
              </div>
              <textarea
                className={`input min-h-[220px] ${bodyMode === 'html' ? 'font-mono text-xs' : ''}`}
                placeholder={bodyMode === 'html' ? '<p>Article body with HTML...</p>' : 'Article body text...'}
                value={editor.body ?? ''}
                onChange={(event) => setEditor({ ...editor, body: event.target.value })}
              />
              {bodyMode === 'html' && (
                <div className="mt-3 rounded-lg bg-brand-light p-3 text-sm">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Preview</div>
                  <div dangerouslySetInnerHTML={{ __html: editor.body ?? '' }} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2"><button className="btn-outline" onClick={() => setEditor(null)}>Cancel</button><button className="btn-primary" onClick={() => void save()}>Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
