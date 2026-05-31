'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MediaAsset } from './ImagePicker';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:<mime>;base64," prefix and return just the encoded payload
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function MediaPicker({
  value,
  onSelect,
  folder = 'documents',
  label = 'Choose file',
  accept = 'image/jpeg,image/png,image/webp,image/svg+xml,application/pdf,text/plain,.ies,.ldt',
}: {
  value?: string | null;
  onSelect: (url: string) => void;
  folder?: string;
  label?: string;
  accept?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const qs = new URLSearchParams({ limit: '60', folder });
    if (search) qs.set('search', search);
    setBusy(true);
    api.get<MediaAsset[]>(`/admin/media?${qs}`)
      .then((response) => setItems(response.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setBusy(false));
  }

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const mimeType = file.type || 'application/octet-stream';
      const dataBase64 = await fileToBase64(file);
      // One-shot upload — works for both local disk and MinIO storage drivers.
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
      <div className="flex items-center gap-2">
        {value && <span className="max-w-[220px] truncate rounded-lg bg-brand-light px-3 py-2 text-xs font-mono">{value}</span>}
        <button type="button" className="btn-outline btn-sm" onClick={() => setOpen(true)}>{label}</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5">
          <div className="card max-h-[90vh] w-full max-w-4xl overflow-auto p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">Media / Documents</h2>
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <input className="input max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files" />
              <button type="button" className="btn-outline" onClick={load}>Search</button>
              <label className="btn-primary cursor-pointer">
                Upload file
                <input className="hidden" type="file" accept={accept} onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void upload(file);
                }} />
              </label>
            </div>
            {error && <p className="mb-3 text-sm text-status-error">{error}</p>}
            {busy && items.length === 0 ? <p className="text-sm text-brand-gray">Loading...</p> : (
              <div className="grid gap-3 md:grid-cols-3">
                {items.map((asset) => (
                  <button key={asset.id} type="button" className="card p-3 text-left hover:border-brand-blue" onClick={() => { onSelect(asset.url); setOpen(false); }}>
                    <div className="font-semibold truncate">{asset.filename}</div>
                    <div className="mt-1 text-xs text-brand-gray">{asset.mimeType}</div>
                    <div className="mt-2 truncate font-mono text-[11px] text-brand-gray">{asset.url}</div>
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
