'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export interface MediaAsset {
  id: number;
  url: string;
  filename: string;
  mimeType: string;
  folder: string;
  altText: string | null;
}

export function ImagePicker({
  value,
  onSelect,
  folder = 'misc',
  label = 'Choose from media library',
}: {
  value?: string | null;
  onSelect: (url: string) => void;
  folder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const qs = new URLSearchParams({ limit: '60' });
    if (search) qs.set('search', search);
    setBusy(true);
    api.get<MediaAsset[]>(`/admin/media?${qs}`)
      .then((response) => setItems(response.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    if (open) load();
    // Search executes when the button/form requests it, keeping uploads responsive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const mimeType = file.type || 'application/octet-stream';
      const dataBase64 = await fileToBase64(file);
      const stored = await api.post<MediaAsset>('/admin/media/upload', {
        filename: file.name,
        mimeType,
        folder,
        dataBase64,
      });
      setItems((current) => [stored.data, ...current]);
      onSelect(stored.data.url);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 items-center">
        {value && <img src={value} alt="" className="h-12 w-12 rounded-lg object-cover bg-brand-light" />}
        <button type="button" className="btn-outline btn-sm" onClick={() => setOpen(true)}>{label}</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-5">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-auto p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-extrabold">Media Library</h2>
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <input className="input max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search images" />
              <button type="button" className="btn-outline" onClick={load}>Search</button>
              <label className="btn-primary cursor-pointer">
                Upload image
                <input className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }} />
              </label>
            </div>
            {error && <p className="mb-3 text-sm text-status-error">{error}</p>}
            {busy && items.length === 0 ? <p className="text-sm text-brand-gray">Loading...</p> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {items.map((asset) => (
                  <button key={asset.id} type="button" className="card overflow-hidden text-left hover:border-brand-blue" onClick={() => { onSelect(asset.url); setOpen(false); }}>
                    <img src={asset.url} alt={asset.altText ?? ''} className="aspect-square w-full object-cover bg-brand-light" />
                    <span className="block p-2 text-xs truncate">{asset.filename}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
