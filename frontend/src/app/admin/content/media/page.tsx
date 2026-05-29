'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ImagePicker, MediaAsset } from '@/components/admin/ImagePicker';

export default function MediaLibraryPage() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [folder, setFolder] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    const query = new URLSearchParams({ limit: '100' });
    if (search) query.set('search', search);
    if (folder) query.set('folder', folder);
    api.get<MediaAsset[]>(`/admin/media?${query}`).then((response) => setItems(response.data)).catch((err) => setMessage((err as Error).message));
  }
  useEffect(load, []);

  async function remove(asset: MediaAsset) {
    if (!confirm(`Delete "${asset.filename}" from the media library?`)) return;
    await api.del(`/admin/media/${asset.id}`);
    setMessage('Media asset deleted.');
    load();
  }

  return (
    <div>
      <header className="mb-5 flex flex-wrap justify-between gap-3">
        <div>
          <div className="section-eyebrow">Content</div>
          <h1 className="mt-1 text-3xl font-extrabold">Media Library</h1>
          <p className="text-sm text-brand-gray">Upload once, then reuse images and product documents in CMS and product editors.</p>
        </div>
        <ImagePicker label="Upload image" onSelect={() => { setMessage('Image uploaded.'); load(); }} folder="misc" />
      </header>
      {message && <div className="card p-3 mb-4 text-sm">{message}</div>}
      <div className="card p-4 mb-5 flex flex-wrap gap-2">
        <input className="input max-w-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search filename or alt text" />
        <select className="input max-w-[180px]" value={folder} onChange={(event) => setFolder(event.target.value)}>
          <option value="">All folders</option>
          {['banners', 'products', 'documents', 'blog', 'testimonials', 'legal', 'misc'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <button className="btn-primary" onClick={load}>Filter</button>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((asset) => (
          <article key={asset.id} className="card overflow-hidden">
            {asset.mimeType.startsWith('image/') ? <img src={asset.url} alt={asset.altText ?? ''} className="aspect-square object-cover w-full bg-brand-light" /> : <div className="aspect-square w-full bg-brand-light flex items-center justify-center text-sm font-bold text-brand-blue">Document</div>}
            <div className="p-3">
              <div className="font-semibold truncate">{asset.filename}</div>
              <div className="text-xs text-brand-gray">{asset.folder}</div>
              <div className="mt-3 flex gap-1">
                <button className="btn-outline btn-sm" onClick={() => { void navigator.clipboard.writeText(asset.url); setMessage('URL copied.'); }}>Copy URL</button>
                <button className="btn-ghost btn-sm text-status-error" onClick={() => void remove(asset)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
