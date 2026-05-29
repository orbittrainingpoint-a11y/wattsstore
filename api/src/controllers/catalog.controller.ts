/** Public catalog HTTP layer (PRD §8.2). */
import { Request, Response } from 'express';
import { catalogService, ProductFilters } from '../services/catalog.service';
import { ok, paginated, parsePagination } from '../utils/response';

/** Parse PLP/search query string → typed ProductFilters. attributes via attributes[ip_rating]=IP65. */
function parseFilters(query: Record<string, unknown>): ProductFilters {
  const attributes: Record<string, string[]> = {};
  const raw = query.attributes;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      attributes[k] = Array.isArray(v) ? v.map(String) : String(v).split(',');
    }
  }
  const num = (v: unknown) => (v == null ? undefined : Number(v));
  return {
    catId: num(query.catId),
    brand: query.brand as string | undefined,
    minPrice: num(query.minPrice),
    maxPrice: num(query.maxPrice),
    attributes: Object.keys(attributes).length ? attributes : undefined,
    inStock: query.inStock === 'true',
    onSale: query.onSale === 'true',
    newArrivals: query.newArrivals === 'true',
    brandOrigin: query.brandOrigin as string | undefined,
    sort: query.sort as string | undefined,
  };
}

export const catalogController = {
  async categories(_req: Request, res: Response) {
    return ok(res, await catalogService.getCategoryTree());
  },

  async category(req: Request, res: Response) {
    return ok(res, await catalogService.getCategory(req.params.slug));
  },

  async products(req: Request, res: Response) {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filters = parseFilters(req.query as Record<string, unknown>);
    const { items, totalCount } = await catalogService.listProducts(filters, req.context.countryId, skip, limit);
    return paginated(res, items, { page, limit, totalCount });
  },

  async product(req: Request, res: Response) {
    return ok(res, await catalogService.getProductDetail(req.params.slug, req.context.countryId));
  },

  async brands(req: Request, res: Response) {
    return ok(res, await catalogService.getBrands(req.query.featured === 'true'));
  },

  async brand(req: Request, res: Response) {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { brand, products, totalCount } = await catalogService.getBrandWithProducts(
      req.params.slug,
      req.context.countryId,
      skip,
      limit,
    );
    return res.json({ success: true, data: { brand, products }, meta: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) } });
  },

  async search(req: Request, res: Response) {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const q = String(req.query.q ?? '');
    const { items, totalCount } = await catalogService.search(q, req.context.countryId, skip, limit);
    return paginated(res, items, { page, limit, totalCount });
  },

  async autocomplete(req: Request, res: Response) {
    return ok(res, await catalogService.autocomplete(String(req.query.q ?? ''), req.context.countryId));
  },

  async featured(req: Request, res: Response) {
    return ok(res, await catalogService.getFeaturedSections(req.context.countryId));
  },
};
