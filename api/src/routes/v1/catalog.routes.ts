/** Public catalog routes (PRD §8.2). All public, geo-aware via req.context. */
import { Router } from 'express';
import { catalogController } from '../../controllers/catalog.controller';
import { reviewService } from '../../services/review.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { paginated, parsePagination } from '../../utils/response';

export const catalogRoutes = Router();

catalogRoutes.get('/categories', asyncHandler(catalogController.categories));
catalogRoutes.get('/categories/:slug', asyncHandler(catalogController.category));
catalogRoutes.get('/products', asyncHandler(catalogController.products));
catalogRoutes.get(
  '/products/:slug/reviews',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const sort = req.query.sort === 'helpful' ? 'helpful' : 'recent';
    const { items, totalCount, distribution } = await reviewService.listForProduct(req.params.slug, skip, limit, sort);
    return res.json({ success: true, data: items, meta: { page, limit, totalCount, totalPages: Math.ceil(totalCount / limit), distribution } });
  }),
);
catalogRoutes.get('/products/:slug', asyncHandler(catalogController.product));
catalogRoutes.get('/brands', asyncHandler(catalogController.brands));
catalogRoutes.get('/brands/:slug', asyncHandler(catalogController.brand));
catalogRoutes.get('/search', asyncHandler(catalogController.search));
catalogRoutes.get('/search/autocomplete', asyncHandler(catalogController.autocomplete));
catalogRoutes.get('/featured', asyncHandler(catalogController.featured));
