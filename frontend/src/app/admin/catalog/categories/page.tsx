'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  showInMenu: boolean;
  parentId: number | null;
  sortOrder: number;
  depth: number;
  variantSpecificationSchema: VariantField[] | null;
}

interface VariantField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  options?: string[];
  filterEnabled?: boolean;
}

interface CategoryForm {
  id?: number;
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  sortOrder: number;
  showInMenu: boolean;
  variantSpecificationSchema: VariantField[];
}

const emptyForm = (parentId: number | null = null): CategoryForm => ({
  name: '',
  slug: '',
  description: '',
  parentId,
  sortOrder: 0,
  showInMenu: true,
  variantSpecificationSchema: [],
});

export default function AdminCategories() {
  const [rows, setRows] = useState<Category[]>([]);
  const [editor, setEditor] = useState<CategoryForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<'details' | 'variants'>('details');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [search, setSearch] = useState('');

  function load() {
    setLoading(true);
    api.get<Category[]>('/admin/categories')
      .then((response) => setRows(response.data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const ordered = useMemo(() => {
    const children = new Map<number | null, Category[]>();
    for (const row of rows) {
      const key = row.parentId ?? null;
      children.set(key, [...(children.get(key) ?? []), row]);
    }
    const result: Category[] = [];
    const visit = (parentId: number | null) => {
      for (const row of (children.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))) {
        result.push(row);
        visit(row.id);
      }
    };
    visit(null);
    const q = search.trim().toLowerCase();
    return result.filter((row) => {
      if (statusFilter === 'active' && !row.isActive) return false;
      if (statusFilter === 'archived' && row.isActive) return false;
      return !q || row.name.toLowerCase().includes(q) || row.slug.toLowerCase().includes(q);
    });
  }, [rows, search, statusFilter]);

  async function save() {
    if (!editor?.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: editor.name.trim(),
        slug: editor.slug.trim() || undefined,
        description: editor.description.trim(),
        parentId: editor.parentId,
        sortOrder: editor.sortOrder,
        showInMenu: editor.showInMenu,
        variantSpecificationSchema: editor.variantSpecificationSchema.map((field) => ({
          ...field,
          field: field.field.trim(),
          label: field.label.trim(),
          options: (field.options ?? []).map((option) => option.trim()).filter(Boolean),
        })),
      };
      if (editor.id) {
        await api.put(`/admin/categories/${editor.id}`, payload);
        setMessage('Category updated.');
      } else {
        await api.post('/admin/categories', payload);
        setMessage('Category created.');
      }
      setEditor(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function archive(row: Category) {
    const action = prompt(`Archive "${row.name}". What should happen to products in this category?\n\nType one:\narchive_only = keep products linked but hide category\narchive_products = also archive products\nmove_products = move products first, then archive`, 'archive_only');
    if (!action) return;
    let targetCategoryId: number | undefined;
    if (action === 'move_products') {
      const target = prompt('Enter target category ID for products:');
      targetCategoryId = target ? Number(target) : undefined;
    }
    setError(null);
    try {
      await api.put(`/admin/categories/${row.id}/archive`, { action, targetCategoryId });
      setMessage('Category deleted from active catalog.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function restore(row: Category) {
    setError(null);
    try {
      await api.put(`/admin/categories/${row.id}/restore`);
      setMessage('Category unarchived.');
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function edit(row: Category) {
    setEditor({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description ?? '',
      parentId: row.parentId,
      sortOrder: row.sortOrder,
      showInMenu: row.showInMenu,
      variantSpecificationSchema: normalizeSchema(row.variantSpecificationSchema),
    });
    setEditorTab('details');
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Catalog</div>
          <h1 className="mt-1 text-3xl font-extrabold">Categories</h1>
          <p className="text-sm text-brand-gray">Build up to 4 levels of categories and subcategories.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-xs" placeholder="Filter categories..." value={search} onChange={(event) => setSearch(event.target.value)} />
          <select className="input w-36" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <button className="btn-primary" onClick={() => { setEditor(emptyForm()); setEditorTab('details'); }}>+ Add Category</button>
        </div>
      </header>

      {message && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-light text-left text-[11px] uppercase tracking-[0.18em] text-brand-gray">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Level</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Menu</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="p-8 text-brand-gray" colSpan={6}>Loading categories...</td></tr>}
            {!loading && ordered.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 hover:bg-brand-blue/5">
                <td className="p-4 font-semibold">
                  <span style={{ paddingLeft: `${(row.depth - 1) * 22}px` }} className="inline-flex items-center gap-2">
                    {row.depth > 1 && <span className="text-brand-gray">|-</span>}
                    {row.name}
                  </span>
                </td>
                <td className="p-4"><span className="badge-blue">Level {row.depth}</span></td>
                <td className="p-4 font-mono text-xs">{row.slug}</td>
                <td className="p-4">{row.showInMenu ? 'Yes' : 'No'}</td>
                <td className="p-4"><span className={`badge ${row.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{row.isActive ? 'Active' : 'Archived'}</span></td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {row.depth < 4 && row.isActive && <button className="btn-outline btn-sm" onClick={() => { setEditor(emptyForm(row.id)); setEditorTab('details'); }}>+ Child</button>}
                    <button className="btn-outline btn-sm" onClick={() => edit(row)}>Edit</button>
                    {row.isActive && <button className="btn-ghost btn-sm text-status-error" onClick={() => archive(row)}>Delete</button>}
                    {!row.isActive && <button className="btn-ghost btn-sm text-status-success" onClick={() => restore(row)}>Unarchive</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="card max-h-[92vh] w-full max-w-3xl overflow-auto p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-extrabold">{editor.id ? 'Edit category' : 'Add category'}</h2>
              <button className="text-2xl text-brand-gray" onClick={() => setEditor(null)} aria-label="Close">x</button>
            </div>

            <div className="mb-5 flex gap-2 border-b border-gray-100">
              <button className={`px-3 py-2 text-sm font-bold ${editorTab === 'details' ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-brand-gray'}`} onClick={() => setEditorTab('details')}>Category details</button>
              <button className={`px-3 py-2 text-sm font-bold ${editorTab === 'variants' ? 'border-b-2 border-brand-blue text-brand-blue' : 'text-brand-gray'}`} onClick={() => setEditorTab('variants')}>Variant types</button>
            </div>

            {editorTab === 'details' ? (
              <div className="space-y-3">
                <Field label="Name *" value={editor.name} onChange={(value) => setEditor({ ...editor, name: value })} />
                <Field label="Slug (generated if empty)" value={editor.slug} onChange={(value) => setEditor({ ...editor, slug: value })} />
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Parent category</span>
                  <select className="input mt-1.5" value={editor.parentId ?? ''} onChange={(event) => setEditor({ ...editor, parentId: event.target.value ? Number(event.target.value) : null })}>
                    <option value="">Top level</option>
                    {ordered.filter((row) => row.id !== editor.id && row.depth < 4 && row.isActive).map((row) => (
                      <option key={row.id} value={row.id}>{`${'-- '.repeat(row.depth - 1)}${row.name} (Level ${row.depth})`}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Description</span>
                  <textarea className="input mt-1.5 min-h-[80px]" value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Sort order</span>
                    <input type="number" className="input mt-1.5" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} />
                  </label>
                  <label className="mt-7 flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" checked={editor.showInMenu} onChange={(event) => setEditor({ ...editor, showInMenu: event.target.checked })} />
                    Show in storefront menu
                  </label>
                </div>
              </div>
            ) : (
              <VariantSchemaEditor value={editor.variantSpecificationSchema} onChange={(variantSpecificationSchema) => setEditor({ ...editor, variantSpecificationSchema })} />
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditor(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => void save()} disabled={busy}>{busy ? 'Saving...' : 'Save category'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function normalizeSchema(schema: VariantField[] | null | undefined): VariantField[] {
  if (!Array.isArray(schema)) return [];
  return schema.map((field) => ({
    field: field.field ?? '',
    label: field.label ?? '',
    type: field.type ?? 'string',
    required: field.required ?? false,
    filterEnabled: field.filterEnabled ?? true,
    options: Array.isArray(field.options) ? field.options : [],
  }));
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span>
      <input className="input mt-1.5" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function VariantSchemaEditor({ value, onChange }: { value: VariantField[]; onChange: (value: VariantField[]) => void }) {
  function update(index: number, patch: Partial<VariantField>) {
    onChange(value.map((field, i) => (i === index ? { ...field, ...patch } : field)));
  }

  function addField() {
    onChange([...value, { field: '', label: '', type: 'string', required: true, filterEnabled: true, options: [] }]);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold">Variant types for this category</h3>
          <p className="mt-1 text-sm text-brand-gray">These fields appear when creating variants for products in this category. Example: wattage, color, size, voltage.</p>
        </div>
        <button className="btn-outline btn-sm" onClick={addField}>+ Add variant type</button>
      </div>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-brand-gray">
          No variant types yet. Add at least one field if this category has configurable SKUs.
        </div>
      ) : (
        <div className="space-y-4">
          {value.map((field, index) => (
            <div key={index} className="rounded-xl border border-gray-100 bg-brand-light/40 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="font-bold">Variant type #{index + 1}</div>
                <button className="btn-ghost btn-sm text-status-error" onClick={() => onChange(value.filter((_, i) => i !== index))}>Remove</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Field key *" value={field.field} placeholder="wattage" onChange={(input) => update(index, { field: input.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} />
                <Field label="Label *" value={field.label} placeholder="Wattage" onChange={(input) => update(index, { label: input })} />
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Input type</span>
                  <select className="input mt-1.5" value={field.type} onChange={(event) => update(index, { type: event.target.value as VariantField['type'] })}>
                    <option value="string">Text / dropdown</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes / No</option>
                  </select>
                </label>
                <label className="mt-7 flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={field.required ?? false} onChange={(event) => update(index, { required: event.target.checked })} />
                  Required
                </label>
              </div>
              {field.type !== 'boolean' && (
                <label className="mt-3 block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Options</span>
                  <textarea
                    className="input mt-1.5 min-h-[70px]"
                    placeholder="One option per line, e.g. 50W"
                    value={(field.options ?? []).join('\n')}
                    onChange={(event) => update(index, { options: event.target.value.split('\n').map((option) => option.trim()).filter(Boolean) })}
                  />
                  <span className="mt-1 block text-xs text-brand-gray">If options are provided, the product variant form will show a dropdown. Leave empty for free text/number.</span>
                </label>
              )}
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={field.filterEnabled ?? true} onChange={(event) => update(index, { filterEnabled: event.target.checked })} />
                Use as storefront filter/menu option
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
