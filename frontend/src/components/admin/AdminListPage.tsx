'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Column<T> { label: string; render: (row: T) => React.ReactNode }

interface Props<T> {
  eyebrow: string;
  title: string;
  endpoint: string;
  columns: Column<T>[];
  empty?: { icon: string; title: string; sub?: string };
  rowKey: (row: T) => string | number;
}

/** Generic admin list table — fetches from API, renders columns, handles loading/empty. */
export function AdminListPage<T>({ eyebrow, title, endpoint, columns, empty, rowKey }: Props<T>) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<T[]>(endpoint).then((r) => setRows(r.data)).catch((e) => setErr((e as Error).message)).finally(() => setLoading(false));
  }, [endpoint]);

  return (
    <div>
      <header className="mb-6">
        <div className="section-eyebrow">{eyebrow}</div>
        <h1 className="mt-1 text-3xl font-extrabold">{title}</h1>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left" style={{ background: 'linear-gradient(180deg,#eef3fa 0%,#f7f9fc 100%)' }}>
            <tr className="text-[11px] uppercase tracking-[0.18em] text-brand-gray">
              {columns.map((c) => <th key={c.label} className="p-4 font-bold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-10 text-center text-brand-gray" colSpan={columns.length}>Loading…</td></tr>
            ) : err ? (
              <tr><td className="p-10 text-center text-status-error" colSpan={columns.length}>⚠ {err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="p-10 text-center text-brand-gray" colSpan={columns.length}>
                <div className="text-5xl">{empty?.icon ?? '📄'}</div>
                <p className="mt-3 font-semibold text-brand-dark">{empty?.title ?? 'Nothing to show yet'}</p>
                {empty?.sub && <p className="text-xs">{empty.sub}</p>}
              </td></tr>
            ) : (
              rows.map((r) => (
                <tr key={rowKey(r)} className="border-t border-gray-100 hover:bg-brand-blue/5">
                  {columns.map((c) => <td key={c.label} className="p-4">{c.render(r)}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
