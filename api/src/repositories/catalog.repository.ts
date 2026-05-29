/** Prisma query layer for catalog (categories, brands, products). No business logic. */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/** Pricing for the active country only — keeps PDP/PLP payloads region-scoped. */
function pricingInclude(countryId: number) {
  return { where: { countryId }, take: 1 } as const;
}

export const catalogRepository = {
  // ── Categories ──
  getCategoryTree() {
    return prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  },

  getActiveCategoryIds() {
    return prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, parentId: true },
    });
  },

  getCategoryBySlug(slug: string) {
    return prisma.category.findFirst({
      where: { slug, isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });
  },

  // ── Brands ──
  getBrands(featuredOnly = false) {
    return prisma.brand.findMany({
      where: { isActive: true, ...(featuredOnly ? { isFeatured: true } : {}) },
      orderBy: { sortOrder: 'asc' },
    });
  },

  getBrandBySlug(slug: string) {
    return prisma.brand.findFirst({ where: { slug, isActive: true } });
  },

  // ── Products ──
  getProductBySlug(slug: string, countryId: number) {
    return prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        brand: true,
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        documents: { orderBy: { sortOrder: 'asc' } },
        faqs: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        variants: {
          where: { isActive: true },
          include: { pricing: pricingInclude(countryId) },
        },
        crossSells: {
          include: {
            relatedProduct: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
                variants: { where: { isActive: true }, take: 1, include: { pricing: pricingInclude(countryId) } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
          take: 4,
        },
      },
    });
  },

  /** PLP / search: build the where + orderBy from filters, return paginated products with region pricing. */
  async listProducts(opts: {
    countryId: number;
    where: Prisma.ProductWhereInput;
    orderBy: Prisma.ProductOrderByWithRelationInput | Prisma.ProductOrderByWithRelationInput[];
    skip: number;
    take: number;
  }) {
    const [items, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: opts.where,
        orderBy: opts.orderBy,
        skip: opts.skip,
        take: opts.take,
        include: {
          brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
          images: { where: { isPrimary: true }, take: 1 },
          variants: {
            where: { isActive: true },
            include: { pricing: pricingInclude(opts.countryId) },
          },
        },
      }),
      prisma.product.count({ where: opts.where }),
    ]);
    return { items, totalCount };
  },

  /**
   * Get product IDs that match column-comparison filters (sale, in-stock) that Prisma's
   * generated where-clause can't express. Caller intersects this with the Prisma where.
   */
  async filterByPricingComparison(opts: { countryId: number; inStock?: boolean; onSale?: boolean }): Promise<number[]> {
    const conds: Prisma.Sql[] = [Prisma.sql`rip.country_id = ${opts.countryId}`, Prisma.sql`rip.is_available = true`];
    if (opts.inStock) conds.push(Prisma.sql`(rip.stock_on_hand - rip.stock_reserved) > 0`);
    if (opts.onSale) conds.push(Prisma.sql`rip.compare_at_price IS NOT NULL AND rip.compare_at_price > rip.retail_price`);
    const where = Prisma.join(conds, ' AND ');
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT DISTINCT p.id
      FROM products p
      JOIN product_variants pv ON pv.product_id = p.id AND pv.is_active = true
      JOIN regional_inventory_pricing rip ON rip.product_variant_id = pv.id
      WHERE p.is_active = true AND ${where};
    `;
    return rows.map((r) => r.id);
  },

  getProductsByBrand(brandId: number, countryId: number, skip: number, take: number) {
    return this.listProducts({
      countryId,
      where: { brandId, isActive: true },
      orderBy: { totalSold: 'desc' },
      skip,
      take,
    });
  },

  /** Homepage rails. */
  getFeatured(countryId: number, limit: number) {
    return this.listProducts({
      countryId,
      where: { isActive: true, isFeatured: true },
      orderBy: { totalSold: 'desc' },
      skip: 0,
      take: limit,
    });
  },

  getNewArrivals(countryId: number, limit: number) {
    return this.listProducts({
      countryId,
      where: { isActive: true, isNewArrival: true },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: limit,
    });
  },

  getBestSellers(countryId: number, limit: number) {
    return this.listProducts({
      countryId,
      where: { isActive: true },
      orderBy: { totalSold: 'desc' },
      skip: 0,
      take: limit,
    });
  },

  /** Full-text search via raw tsquery; returns ranked product ids. */
  async searchProductIds(query: string, limit: number, offset: number): Promise<number[]> {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id,
             ts_rank(to_tsvector('english', p.title || ' ' || COALESCE(p.short_description, '')),
                     plainto_tsquery('english', ${query})) AS rank
      FROM products p
      WHERE p.is_active = true
        AND to_tsvector('english', p.title || ' ' || COALESCE(p.short_description, '') || ' ' || COALESCE(p.sku_base, ''))
            @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC, p.total_sold DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    return rows.map((r) => r.id);
  },

  /** Short-query fallback (< 3 chars) — ILIKE on title/sku. */
  autocomplete(query: string, limit: number) {
    return prisma.product.findMany({
      where: {
        isActive: true,
        OR: [{ title: { contains: query, mode: 'insensitive' } }, { skuBase: { contains: query, mode: 'insensitive' } }],
      },
      take: limit,
      orderBy: { totalSold: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        category: { select: { name: true } },
        images: { where: { isPrimary: true }, take: 1, select: { imageUrl: true } },
      },
    });
  },

  getProductsByIds(ids: number[], countryId: number) {
    return prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isActive: true }, include: { pricing: { where: { countryId }, take: 1 } } },
      },
    });
  },
};
