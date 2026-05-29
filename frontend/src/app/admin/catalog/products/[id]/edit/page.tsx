'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ImagePicker } from '@/components/admin/ImagePicker';
import { MediaPicker } from '@/components/admin/MediaPicker';
import { useRouteParams } from '@/lib/useRouteParams';

interface SchemaField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  options?: string[] | string;
}

interface Country {
  id: number;
  countryName: string;
  currencyCode: string;
  currencySymbol: string;
}

interface CategoryOption { id: number; name: string; depth?: number; isActive?: boolean }

interface Pricing {
  countryId: number;
  retailPrice: number | string | null;
  costPrice: number | string;
  stockOnHand: number;
  isAvailable: boolean;
  country: Country;
}

interface Variant {
  id: number;
  variantSku: string;
  attributes: Record<string, string>;
  weightKg: number | string;
  pricing: Pricing[];
}

interface ProductImage {
  id: number;
  imageUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

interface ProductDocument {
  id: number;
  title: string;
  fileUrl: string;
  fileType: 'datasheet' | 'ies' | 'catalogue' | 'manual' | 'certificate' | 'other';
  sortOrder: number;
}

interface ProductFaq {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

interface AdminProduct {
  id: number;
  title: string;
  skuBase: string;
  shortDescription: string | null;
  fullDescription: string | null;
  keyFeatures: string[];
  brandOrigin: string | null;
  datasheetUrl: string | null;
  iesFileUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  category: { id: number; name: string; variantSpecificationSchema: SchemaField[] | null };
  images: ProductImage[];
  documents: ProductDocument[];
  faqs: ProductFaq[];
  variants: Variant[];
}

interface PriceForm {
  retailPrice: string;
  costPrice: string;
  stockOnHand: string;
  isAvailable: boolean;
}

const blankPrice: PriceForm = { retailPrice: '', costPrice: '0', stockOnHand: '0', isAvailable: true };

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(useRouteParams(params).id);
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [variantSku, setVariantSku] = useState('');
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [weightKg, setWeightKg] = useState('0');
  const [variantId, setVariantId] = useState(0);
  const [countryId, setCountryId] = useState(0);
  const [price, setPrice] = useState<PriceForm>(blankPrice);
  const [applyAllMarkets, setApplyAllMarkets] = useState(true);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImagePrimary, setNewImagePrimary] = useState(false);
  const [docDraft, setDocDraft] = useState({ title: '', fileUrl: '', fileType: 'datasheet' as ProductDocument['fileType'] });
  const [faqDraft, setFaqDraft] = useState({ question: '', answer: '' });
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api.get<AdminProduct>(`/admin/products/${id}`), api.get<Country[]>('/admin/countries'), api.get<CategoryOption[]>('/admin/categories')])
      .then(([productResponse, countryResponse, categoryResponse]) => {
        setProduct(productResponse.data);
        setCountries(countryResponse.data);
        setCategories(categoryResponse.data);
        setVariantId((current) => current || productResponse.data.variants[0]?.id || 0);
        setCountryId((current) => current || countryResponse.data[0]?.id || 0);
      })
      .catch((error) => setErr((error as Error).message));
  }

  useEffect(load, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const schema = useMemo(() => product?.category.variantSpecificationSchema ?? [], [product]);
  const selectedVariant = product?.variants.find((variant) => variant.id === variantId);

  useEffect(() => {
    const current = selectedVariant?.pricing.find((row) => row.countryId === countryId);
    setPrice(current ? {
      retailPrice: current.retailPrice == null ? '' : String(current.retailPrice),
      costPrice: String(current.costPrice),
      stockOnHand: String(current.stockOnHand),
      isAvailable: current.isAvailable,
    } : blankPrice);
  }, [selectedVariant, countryId]);

  async function saveProduct() {
    if (!product) return;
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/admin/products/${id}`, {
        title: product.title,
        categoryId: product.category.id,
        skuBase: product.skuBase,
        shortDescription: product.shortDescription,
        fullDescription: product.fullDescription,
        keyFeatures: (product.keyFeatures ?? []).map((feature) => feature.trim()).filter(Boolean),
        brandOrigin: product.brandOrigin || undefined,
        isFeatured: product.isFeatured,
        isNewArrival: product.isNewArrival,
        datasheetUrl: product.datasheetUrl || null,
        iesFileUrl: product.iesFileUrl || null,
        isActive: product.isActive,
      });
      setMsg('Product details saved.');
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addVariant(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { data } = await api.post<Variant>(`/admin/products/${id}/variants`, {
        variantSku: variantSku.trim(),
        attributes: buildVariantAttributes(schema, attributes),
        weightKg: Number(weightKg || 0),
      });
      setVariantSku('');
      setAttributes({});
      setWeightKg('0');
      setVariantId(data.id);
      setMsg('Variant added. Set its regional pricing and stock below.');
      load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fillNextVariantSku() {
    const next = await api.get<{ variantSku: string }>(`/admin/products/${id}/variants/next-sku`).then((r) => r.data.variantSku).catch(() => '');
    if (next) setVariantSku(next);
  }

  async function savePricing(event: React.FormEvent) {
    event.preventDefault();
    if (!variantId || !countryId) return;
    setBusy(true);
    setErr(null);
    try {
      await api.put(`/admin/products/${variantId}/pricing/${countryId}`, {
        retailPrice: price.retailPrice ? Number(price.retailPrice) : null,
        costPrice: Number(price.costPrice || 0),
        stockOnHand: Number(price.stockOnHand || 0),
        isAvailable: price.isAvailable,
        applyToAllCountries: applyAllMarkets,
      });
      setMsg(applyAllMarkets ? 'Price and stock saved for all active markets.' : 'Regional price and stock saved.');
      load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addImage() {
    if (!newImageUrl.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/admin/products/${id}/images`, {
        imagePath: newImageUrl.trim(),
        altText: product?.title,
        isPrimary: newImagePrimary || product?.images.length === 0,
      });
      setNewImageUrl('');
      setNewImagePrimary(false);
      setMsg('Product image added.');
      load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(imageId: number) {
    if (!confirm('Remove this image from the product gallery?')) return;
    try {
      await api.del(`/admin/products/${id}/images/${imageId}`);
      setMsg('Product image removed.');
      load();
    } catch (error) {
      setErr((error as Error).message);
    }
  }

  async function addDocument() {
    if (!docDraft.title.trim() || !docDraft.fileUrl.trim()) return;
    await api.post(`/admin/products/${id}/documents`, { ...docDraft, title: docDraft.title.trim(), fileUrl: docDraft.fileUrl.trim() });
    setDocDraft({ title: '', fileUrl: '', fileType: 'datasheet' });
    setMsg('Product document added.');
    load();
  }

  async function removeDocument(documentId: number) {
    if (!confirm('Remove this product document?')) return;
    await api.del(`/admin/products/${id}/documents/${documentId}`);
    setMsg('Product document removed.');
    load();
  }

  async function addFaq() {
    if (!faqDraft.question.trim() || !faqDraft.answer.trim()) return;
    await api.post(`/admin/products/${id}/faqs`, { question: faqDraft.question.trim(), answer: faqDraft.answer.trim(), isActive: true });
    setFaqDraft({ question: '', answer: '' });
    setMsg('Product FAQ added.');
    load();
  }

  async function toggleFaq(faq: ProductFaq) {
    await api.put(`/admin/products/${id}/faqs/${faq.id}`, { isActive: !faq.isActive });
    load();
  }

  async function removeFaq(faqId: number) {
    if (!confirm('Delete this FAQ?')) return;
    await api.del(`/admin/products/${id}/faqs/${faqId}`);
    setMsg('Product FAQ deleted.');
    load();
  }

  async function archive() {
    if (!confirm('Archive this product? It will be hidden from the storefront.')) return;
    try {
      await api.del(`/admin/products/${id}`);
      setMsg('Product archived.');
      load();
    } catch (error) {
      setErr((error as Error).message);
    }
  }

  async function restore() {
    try {
      await api.put(`/admin/products/${id}/restore`);
      setMsg('Product unarchived.');
      load();
    } catch (error) {
      setErr((error as Error).message);
    }
  }

  if (!product && !err) return <div className="text-sm text-brand-gray">Loading...</div>;
  if (err && !product) return <div className="text-status-error">{err}</div>;
  if (!product) return null;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="section-eyebrow">Catalog</div>
          <h1 className="mt-1 text-3xl font-extrabold">{product.title}</h1>
          <p className="font-mono text-xs text-brand-gray">{product.skuBase} | {product.category.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/catalog/products" className="btn-outline">&lt;- All products</Link>
          {product.isActive ? <button onClick={() => void archive()} className="btn-ghost text-status-error">Archive</button> : <button onClick={() => void restore()} className="btn-ghost text-status-success">Unarchive</button>}
          <button onClick={() => void saveProduct()} className="btn-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </header>

      {msg && <div className="mb-4 rounded-lg bg-status-success/10 p-3 text-sm text-status-success">{msg}</div>}
      {err && <div className="mb-4 rounded-lg bg-status-error/10 p-3 text-sm text-status-error">{err}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="card space-y-3 p-6">
            <h2 className="text-lg font-extrabold">Product details</h2>
            <Field label="Title" value={product.title} onChange={(event) => setProduct({ ...product, title: event.target.value })} />
            <Field label="SKU base" value={product.skuBase} onChange={(event) => setProduct({ ...product, skuBase: event.target.value })} />
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Category</span>
              <select
                className="input mt-1.5"
                value={product.category.id}
                onChange={(event) => {
                  const next = categories.find((category) => category.id === Number(event.target.value));
                  if (next) setProduct({ ...product, category: { ...product.category, id: next.id, name: next.name } });
                }}
              >
                {categories.filter((category) => category.isActive !== false).map((category) => (
                  <option key={category.id} value={category.id}>{`${'-- '.repeat(Math.max(0, (category.depth ?? 1) - 1))}${category.name}`}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Origin</span>
              <select className="input mt-1.5" value={product.brandOrigin ?? ''} onChange={(event) => setProduct({ ...product, brandOrigin: event.target.value })}>
                <option value="">None</option>
                {['Indian', 'Chinese', 'German'].map((origin) => <option key={origin}>{origin}</option>)}
              </select>
            </label>
            <TextArea label="Short description" value={product.shortDescription ?? ''} onChange={(value) => setProduct({ ...product, shortDescription: value })} />
            <TextArea label="Full description (HTML)" tall value={product.fullDescription ?? ''} onChange={(value) => setProduct({ ...product, fullDescription: value })} />
            <div className="space-y-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Key features</span>
                <p className="mt-1 text-xs text-brand-gray">These points appear in the product Key Features section.</p>
              </div>
              {([...(product.keyFeatures ?? []), ''].slice(0, Math.max((product.keyFeatures ?? []).length, 1))).map((feature, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className="input"
                    value={feature}
                    placeholder={`Feature ${index + 1}`}
                    onChange={(event) => {
                      const next = [...(product.keyFeatures ?? [])];
                      next[index] = event.target.value;
                      setProduct({ ...product, keyFeatures: next });
                    }}
                  />
                  <button type="button" className="btn-ghost text-status-error" onClick={() => setProduct({ ...product, keyFeatures: (product.keyFeatures ?? []).filter((_, i) => i !== index) })}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn-outline btn-sm" onClick={() => setProduct({ ...product, keyFeatures: [...(product.keyFeatures ?? []), ''] })}>+ Add feature point</button>
            </div>
            <Field label="Datasheet URL" value={product.datasheetUrl ?? ''} placeholder="/api/v1/media/123/file or https://..." onChange={(event) => setProduct({ ...product, datasheetUrl: event.target.value })} />
            <MediaPicker value={product.datasheetUrl} onSelect={(url) => setProduct({ ...product, datasheetUrl: url })} folder="documents" label="Upload/select datasheet" />
            <Field label="IES / photometric file URL" value={product.iesFileUrl ?? ''} placeholder="/api/v1/media/123/file or https://..." onChange={(event) => setProduct({ ...product, iesFileUrl: event.target.value })} />
            <MediaPicker value={product.iesFileUrl} onSelect={(url) => setProduct({ ...product, iesFileUrl: url })} folder="documents" label="Upload/select IES file" />
          </div>

          <div className="card space-y-4 p-6">
            <div>
              <h2 className="text-lg font-extrabold">Product documents</h2>
              <p className="text-xs text-brand-gray">Attach datasheets, IES files, catalogues, manuals, certificates and other files.</p>
            </div>
            <div className="space-y-2">
              {(product.documents ?? []).map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-3 text-sm">
                  <span className="badge-blue">{doc.fileType}</span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex-1 font-semibold hover:text-brand-blue">{doc.title}</a>
                  <button className="btn-ghost btn-sm text-status-error" onClick={() => void removeDocument(doc.id)}>Remove</button>
                </div>
              ))}
              {(product.documents ?? []).length === 0 && <p className="text-sm text-brand-gray">No extra documents attached.</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_160px]">
              <Field label="Document title" value={docDraft.title} onChange={(event) => setDocDraft({ ...docDraft, title: event.target.value })} />
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">Type</span>
                <select className="input mt-1.5" value={docDraft.fileType} onChange={(event) => setDocDraft({ ...docDraft, fileType: event.target.value as ProductDocument['fileType'] })}>
                  {['datasheet', 'ies', 'catalogue', 'manual', 'certificate', 'other'].map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <Field label="File URL" value={docDraft.fileUrl} onChange={(event) => setDocDraft({ ...docDraft, fileUrl: event.target.value })} />
              <MediaPicker value={docDraft.fileUrl} onSelect={(url) => setDocDraft({ ...docDraft, fileUrl: url })} folder="documents" label="Upload/select file" />
            </div>
            <button className="btn-primary" onClick={() => void addDocument()} disabled={!docDraft.title.trim() || !docDraft.fileUrl.trim()}>Add document</button>
          </div>

          <div className="card space-y-4 p-6">
            <div>
              <h2 className="text-lg font-extrabold">Product FAQ</h2>
              <p className="text-xs text-brand-gray">These questions appear on this product page before the generic buyer Q&A.</p>
            </div>
            <div className="space-y-2">
              {(product.faqs ?? []).map((faq) => (
                <div key={faq.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="font-semibold">{faq.question}</div>
                      <div className="mt-1 text-sm text-brand-gray">{faq.answer}</div>
                    </div>
                    <button className="btn-ghost btn-sm" onClick={() => void toggleFaq(faq)}>{faq.isActive ? 'Hide' : 'Show'}</button>
                    <button className="btn-ghost btn-sm text-status-error" onClick={() => void removeFaq(faq.id)}>Delete</button>
                  </div>
                </div>
              ))}
              {(product.faqs ?? []).length === 0 && <p className="text-sm text-brand-gray">No product-specific FAQ yet.</p>}
            </div>
            <Field label="Question" value={faqDraft.question} onChange={(event) => setFaqDraft({ ...faqDraft, question: event.target.value })} />
            <TextArea label="Answer" value={faqDraft.answer} onChange={(value) => setFaqDraft({ ...faqDraft, answer: value })} />
            <button className="btn-primary" onClick={() => void addFaq()} disabled={!faqDraft.question.trim() || !faqDraft.answer.trim()}>Add FAQ</button>
          </div>

          <div className="card space-y-4 p-6">
            <div>
              <h2 className="text-lg font-extrabold">Product images</h2>
              <p className="text-xs text-brand-gray">Add multiple images for the storefront gallery. Mark one new image as primary for product cards.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {product.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-lg border border-gray-100">
                  <img src={image.imageUrl} alt={image.altText ?? product.title} className="aspect-square w-full bg-brand-light object-cover" />
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="text-[10px] font-bold uppercase text-brand-gray">{image.isPrimary ? 'Primary' : 'Gallery'}</span>
                    <button type="button" className="text-xs text-status-error hover:underline" onClick={() => void removeImage(image.id)}>Remove</button>
                  </div>
                </div>
              ))}
              {product.images.length === 0 && <p className="col-span-full text-sm text-brand-gray">No images attached yet.</p>}
            </div>
            <Field label="Image URL" value={newImageUrl} placeholder="/img/products/catalog/example.jpg" onChange={(event) => setNewImageUrl(event.target.value)} />
            <ImagePicker folder="products" value={newImageUrl} onSelect={setNewImageUrl} label="Choose product image" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newImagePrimary} onChange={(event) => setNewImagePrimary(event.target.checked)} /> Use as primary card image</label>
              <button type="button" className="btn-primary" disabled={busy || !newImageUrl.trim()} onClick={() => void addImage()}>Add image</button>
            </div>
          </div>

          <form onSubmit={addVariant} className="card space-y-3 p-6">
            <div>
              <h2 className="text-lg font-extrabold">Add variant</h2>
              <p className="text-xs text-brand-gray">Specifications are defined by the selected category.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Field label="Variant SKU *" value={variantSku} required onChange={(event) => setVariantSku(event.target.value)} />
                <button type="button" className="btn-ghost btn-sm mt-1" onClick={() => void fillNextVariantSku()}>Auto-generate SKU</button>
              </div>
              <Field label="Weight (kg)" type="number" step="0.001" min="0" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} />
              {schema.map((field) => (
                <AttributeField key={field.field} field={field} value={attributes[field.field] ?? ''} onChange={(value) => setAttributes({ ...attributes, [field.field]: value })} />
              ))}
            </div>
            <button className="btn-primary" disabled={busy}>Add variant</button>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="mb-3 font-extrabold">Flags</h3>
            <label className="flex items-center gap-2 py-1.5 text-sm"><input type="checkbox" checked={product.isFeatured} onChange={(event) => setProduct({ ...product, isFeatured: event.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2 py-1.5 text-sm"><input type="checkbox" checked={product.isNewArrival} onChange={(event) => setProduct({ ...product, isNewArrival: event.target.checked })} /> New arrival</label>
            <span className={`badge mt-2 ${product.isActive ? 'badge-success' : 'bg-gray-100 text-brand-gray'}`}>{product.isActive ? 'Active' : 'Archived'}</span>
          </div>

          <form onSubmit={savePricing} className="card space-y-3 p-5">
            <div>
              <h3 className="font-extrabold">Regional pricing and stock</h3>
              <p className="text-xs text-brand-gray">{product.variants.length} variant{product.variants.length === 1 ? '' : 's'} configured</p>
            </div>
            {product.variants.length === 0 ? (
              <p className="rounded-lg bg-brand-light p-3 text-sm text-brand-gray">Add a variant before setting price or inventory.</p>
            ) : (
              <>
                <Select label="Variant" value={variantId} onChange={(value) => setVariantId(Number(value))}>
                  {product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.variantSku}</option>)}
                </Select>
                <Select label="Market" value={countryId} onChange={(value) => setCountryId(Number(value))}>
                  {countries.map((country) => <option key={country.id} value={country.id}>{country.countryName} ({country.currencyCode})</option>)}
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Retail price" type="number" step="0.01" min="0" value={price.retailPrice} onChange={(event) => setPrice({ ...price, retailPrice: event.target.value })} />
                  <Field label="Cost price" type="number" step="0.01" min="0" value={price.costPrice} onChange={(event) => setPrice({ ...price, costPrice: event.target.value })} />
                </div>
                <Field label="Stock on hand" type="number" min="0" value={price.stockOnHand} onChange={(event) => setPrice({ ...price, stockOnHand: event.target.value })} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={price.isAvailable} onChange={(event) => setPrice({ ...price, isAvailable: event.target.checked })} /> Available for purchase</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={applyAllMarkets} onChange={(event) => setApplyAllMarkets(event.target.checked)} /> Apply this price and stock to all active markets</label>
                <button className="btn-primary w-full" disabled={busy || !countryId}>Save pricing</button>
              </>
            )}
          </form>

          {product.variants.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-extrabold">Variants</h3>
              <div className="space-y-3">
                {product.variants.map((variant) => (
                  <div key={variant.id} className="rounded-lg border border-gray-100 p-3 text-xs">
                    <div className="font-mono font-bold text-brand-blue">{variant.variantSku}</div>
                    <div className="mt-1 text-brand-gray">{Object.values(variant.attributes).join(' | ') || 'No attributes'}</div>
                    <div className="mt-2 text-brand-dark">{variant.pricing.map((row) => `${row.country.currencyCode} ${row.retailPrice ?? 'Contact'} / ${row.stockOnHand} in stock`).join(', ') || 'No regional price yet'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span><input className="input mt-1.5" {...props} /></label>;
}

function TextArea({ label, value, onChange, tall = false }: { label: string; value: string; onChange: (value: string) => void; tall?: boolean }) {
  return <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span><textarea className={`input mt-1.5 ${tall ? 'min-h-[150px] font-mono text-xs' : 'min-h-[60px]'}`} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, children }: { label: string; value: number; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span><select className="input mt-1.5" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>;
}

function AttributeField({ field, value, onChange }: { field: SchemaField; value: string; onChange: (value: string) => void }) {
  const label = `${field.label}${field.required ? ' *' : ''}`;
  if (field.type === 'boolean') {
    return (
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span>
        <select className="input mt-1.5" required={field.required} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </label>
    );
  }
  const options = Array.isArray(field.options) ? field.options : [];
  if (options.length) {
    return (
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gray">{label}</span>
        <select className="input mt-1.5" required={field.required} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Select</option>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  return <Field label={label} required={field.required} type={field.type === 'number' ? 'number' : 'text'} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function buildVariantAttributes(schema: SchemaField[], values: Record<string, string>) {
  return schema.reduce<Record<string, string | number | boolean>>((result, field) => {
    const raw = values[field.field];
    if (raw === undefined || raw === '') return result;
    if (field.type === 'number') result[field.field] = Number(raw);
    else if (field.type === 'boolean') result[field.field] = raw === 'true';
    else result[field.field] = raw;
    return result;
  }, {});
}
