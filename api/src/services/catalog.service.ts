/**
 * Catalog business logic — builds region-aware filters, resolves display pricing/stock,
 * shapes API payloads, and caches hot reads in Redis (PRD §10, §15, §18.1).
 */
import { Prisma } from '@prisma/client';
import { catalogRepository } from '../repositories/catalog.repository';
import { cacheGet, cacheSet } from '../config/redis';
import { AppError } from '../utils/AppError';

type ProductWithRels = Awaited<ReturnType<typeof catalogRepository.listProducts>>['items'][number];

export interface ProductFilters {
  catId?: number;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  attributes?: Record<string, string[]>;
  inStock?: boolean;
  onSale?: boolean;
  brandOrigin?: string;
  newArrivals?: boolean;
  sort?: string;
}

const dec = (v: Prisma.Decimal | null | undefined): number | null => (v == null ? null : Number(v));

/** Resolve the cheapest in-stock variant's pricing for product-card display. */
function resolveCardPrice(product: ProductWithRels) {
  let best: { retailPrice: number | null; compareAtPrice: number | null; stockAvailable: number } | null = null;
  let totalAvailable = 0;
  for (const v of product.variants) {
    const p = v.pricing[0];
    if (!p) continue;
    const available = p.stockOnHand - p.stockReserved;
    totalAvailable += Math.max(0, available);
    const retail = dec(p.retailPrice);
    if (best === null || (retail != null && (best.retailPrice == null || retail < best.retailPrice))) {
      best = { retailPrice: retail, compareAtPrice: dec(p.compareAtPrice), stockAvailable: available };
    }
  }
  return {
    price: best?.retailPrice ?? null,
    compareAtPrice: best?.compareAtPrice ?? null,
    inStock: totalAvailable > 0,
    variantCount: product.variants.length,
  };
}

function shapeCard(product: ProductWithRels, isPriceVisible = product.isPriceVisible) {
  const pricing = resolveCardPrice(product);
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    skuBase: product.skuBase,
    brand: product.brand ?? null,
    brandOrigin: product.brandOrigin,
    image: product.images[0]?.imageUrl ?? null,
    averageRating: dec(product.averageRating),
    reviewCount: product.reviewCount,
    isPriceVisible,
    price: isPriceVisible ? pricing.price : null,
    compareAtPrice: isPriceVisible ? pricing.compareAtPrice : null,
    inStock: pricing.inStock,
    variantCount: pricing.variantCount,
  };
}

const SORT_MAP: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  featured: { isFeatured: 'desc' },
  newest: { createdAt: 'desc' },
  top_rated: { averageRating: 'desc' },
  popular: { totalSold: 'desc' },
};

export const catalogService = {
  async getCategoryTree() {
    const cacheKey = 'catalog:category-tree';
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const flat = await catalogRepository.getCategoryTree();
    const byId = new Map(flat.map((c) => [c.id, { ...c, children: [] as unknown[] }]));
    const roots: unknown[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        (byId.get(node.parentId)!.children as unknown[]).push(node);
      } else {
        roots.push(node);
      }
    }
    await cacheSet(cacheKey, roots, 10 * 60);
    return roots;
  },

  async getCategory(slug: string) {
    const category = await catalogRepository.getCategoryBySlug(slug);
    if (!category) throw AppError.notFound('CATEGORY_NOT_FOUND', 'Category not found.');
    return category;
  },

  /** Build a Prisma where clause from PLP filters (region-aware). */
  async buildWhere(filters: ProductFilters, countryId: number): Promise<Prisma.ProductWhereInput> {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (filters.catId) where.categoryId = { in: await this.categoryWithDescendants(filters.catId) };
    if (filters.brand) where.brand = { slug: filters.brand };
    if (filters.brandOrigin) where.brandOrigin = filters.brandOrigin;
    if (filters.newArrivals) where.isNewArrival = true;

    const variantSome: Prisma.ProductVariantWhereInput = { isActive: true };
    const pricingSome: Prisma.RegionalInventoryPricingWhereInput = { countryId };
    if (filters.minPrice != null || filters.maxPrice != null) {
      pricingSome.retailPrice = {
        ...(filters.minPrice != null ? { gte: filters.minPrice } : {}),
        ...(filters.maxPrice != null ? { lte: filters.maxPrice } : {}),
      };
    }
    // inStock / onSale require column-to-column comparison (stockOnHand > stockReserved,
    // compareAtPrice > retailPrice). Prisma can't do this — we intersect via raw-SQL in
    // listProducts(). Here we only keep the country scope.
    variantSome.pricing = { some: pricingSome };

    // Dynamic attribute filters (JSONB). AND across attributes, OR across each attribute's values.
    const attrAnd: Prisma.ProductWhereInput[] = [];
    if (filters.attributes) {
      for (const [key, values] of Object.entries(filters.attributes)) {
        if (!values.length) continue;
        attrAnd.push({
          variants: {
            some: {
              isActive: true,
              OR: values.map((val) => ({ attributes: { path: [key], equals: val } })),
            },
          },
        });
      }
    }

    where.variants = { some: variantSome };
    if (attrAnd.length) where.AND = attrAnd;
    return where;
  },

  async categoryWithDescendants(categoryId: number): Promise<number[]> {
    const rows = await catalogRepository.getActiveCategoryIds();
    const children = new Map<number | null, number[]>();
    for (const row of rows) {
      const parentId = row.parentId ?? null;
      children.set(parentId, [...(children.get(parentId) ?? []), row.id]);
    }
    const result = new Set<number>([categoryId]);
    const visit = (id: number) => {
      for (const childId of children.get(id) ?? []) {
        if (!result.has(childId)) {
          result.add(childId);
          visit(childId);
        }
      }
    };
    visit(categoryId);
    return [...result];
  },

  resolveSort(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
    if (sort === 'price_asc' || sort === 'price_desc') {
      // True per-region price sort needs raw SQL; approximate with popularity.
      return [{ totalSold: 'desc' }];
    }
    return [SORT_MAP[sort ?? 'featured'] ?? SORT_MAP.featured];
  },

  async listProducts(filters: ProductFilters, countryId: number, skip: number, take: number) {
    const where = await this.buildWhere(filters, countryId);
    if (filters.inStock || filters.onSale) {
      const allowedIds = await catalogRepository.filterByPricingComparison({ countryId, inStock: filters.inStock, onSale: filters.onSale });
      where.id = { in: allowedIds };
    }
    const orderBy = this.resolveSort(filters.sort);
    const { items, totalCount } = await catalogRepository.listProducts({ countryId, where, orderBy, skip, take });
    return { items: items.map((p) => shapeCard(p)), totalCount };
  },

  async getProductDetail(slug: string, countryId: number) {
    const cacheKey = `catalog:product:${slug}:${countryId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const product = await catalogRepository.getProductBySlug(slug, countryId);
    if (!product) throw AppError.notFound('PRODUCT_NOT_FOUND', 'Product not found.');

    const variants = product.variants.map((v) => {
      const p = v.pricing[0];
      const available = p ? p.stockOnHand - p.stockReserved : 0;
      return {
        id: v.id,
        variantSku: v.variantSku,
        attributes: v.attributes,
        weightKg: dec(v.weightKg),
        dimensions: v.dimensions,
        barcode: v.barcode,
        price: product.isPriceVisible ? dec(p?.retailPrice) : null,
        compareAtPrice: product.isPriceVisible ? dec(p?.compareAtPrice) : null,
        stockAvailable: Math.max(0, available),
        stockLowThreshold: p?.stockLowThreshold ?? 5,
        isAvailable: p?.isAvailable ?? false,
      };
    });

    const result = {
      id: product.id,
      title: product.title,
      slug: product.slug,
      skuBase: product.skuBase,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      keyFeatures: product.keyFeatures,
      brandOrigin: product.brandOrigin,
      isPriceVisible: product.isPriceVisible,
      datasheetUrl: product.datasheetUrl,
      iesFileUrl: product.iesFileUrl,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      averageRating: dec(product.averageRating),
      reviewCount: product.reviewCount,
      brand: product.brand,
      category: { id: product.category.id, name: product.category.name, slug: product.category.slug },
      variantSchema: product.category.variantSpecificationSchema,
      images: product.images.map((i) => ({ url: i.imageUrl, alt: i.altText, isPrimary: i.isPrimary })),
      documents: ((product as typeof product & { documents?: { id: number; title: string; fileUrl: string; fileType: string; sortOrder: number }[] }).documents ?? []).map((doc) => ({
        id: doc.id,
        title: doc.title,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
      })),
      faqs: ((product as typeof product & { faqs?: { id: number; question: string; answer: string }[] }).faqs ?? []).map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
      })),
      variants,
      crossSells: product.crossSells.map((cs) => shapeCard(cs.relatedProduct as never)),
    };

    await cacheSet(cacheKey, result, 5 * 60);
    return result;
  },

  async getFeaturedSections(countryId: number) {
    const cacheKey = `catalog:featured:${countryId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const [featured, newArrivals, bestSellers] = await Promise.all([
      catalogRepository.getFeatured(countryId, 8),
      catalogRepository.getNewArrivals(countryId, 8),
      catalogRepository.getBestSellers(countryId, 8),
    ]);
    const result = {
      featured: featured.items.map((p) => shapeCard(p)),
      newArrivals: newArrivals.items.map((p) => shapeCard(p)),
      bestSellers: bestSellers.items.map((p) => shapeCard(p)),
    };
    await cacheSet(cacheKey, result, 5 * 60);
    return result;
  },

  async getBrands(featuredOnly: boolean) {
    return catalogRepository.getBrands(featuredOnly);
  },

  async getBrandWithProducts(slug: string, countryId: number, skip: number, take: number) {
    const brand = await catalogRepository.getBrandBySlug(slug);
    if (!brand) throw AppError.notFound('BRAND_NOT_FOUND', 'Brand not found.');
    const { items, totalCount } = await catalogRepository.getProductsByBrand(brand.id, countryId, skip, take);
    return { brand, products: items.map((p) => shapeCard(p)), totalCount };
  },

  async search(query: string, countryId: number, skip: number, take: number) {
    const q = query.trim();
    if (q.length < 3) {
      // short-query fallback handled in autocomplete; for full search ILIKE on title/sku
      const where = await this.buildWhere({}, countryId);
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { skuBase: { contains: q, mode: 'insensitive' } },
      ];
      const { items, totalCount } = await catalogRepository.listProducts({
        countryId,
        where,
        orderBy: [{ totalSold: 'desc' }],
        skip,
        take,
      });
      return { items: items.map((p) => shapeCard(p)), totalCount };
    }
    const ids = await catalogRepository.searchProductIds(q, take, skip);
    if (!ids.length) return { items: [], totalCount: 0 };
    const products = await catalogRepository.getProductsByIds(ids, countryId);
    // preserve rank order
    const order = new Map(ids.map((id, idx) => [id, idx]));
    products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { items: products.map((p) => shapeCard(p as never)), totalCount: ids.length };
  },

  async autocomplete(query: string, countryId: number) {
    const q = query.trim();
    if (!q) return [];
    const cacheKey = `catalog:autocomplete:${countryId}:${q.toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const rows = await catalogRepository.autocomplete(q, 5);
    const result = rows.map((r) => ({
      title: r.title,
      slug: r.slug,
      category: r.category.name,
      image: r.images[0]?.imageUrl ?? null,
    }));
    await cacheSet(cacheKey, result, 2 * 60);
    return result;
  },
};
