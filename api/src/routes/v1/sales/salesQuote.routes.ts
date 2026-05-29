/** Sales-agent RFQ management (PRD §8.7). Requires sales_agent / admin / super_admin. */
import { Router, Request, Response } from 'express';
import { salesQuoteService } from '../../../services/salesQuote.service';
import { salesAgentService } from '../../../services/admin/salesAgent.service';
import { requireAuth, requireSales } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, paginated, parsePagination } from '../../../utils/response';
import { setPricesSchema, quoteStatusSchema } from '../../../validators/quote.validator';
import { quoteMessageService } from '../../../services/quoteMessage.service';
import { z } from 'zod';

export const salesRoutes = Router();
salesRoutes.use(requireAuth, requireSales);

salesRoutes.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const [dashboard, series] = await Promise.all([
      salesAgentService.dashboard(req.user!.id),
      salesAgentService.monthlySeries(req.user!.id, 6),
    ]);
    return ok(res, { ...dashboard, series });
  }),
);

salesRoutes.get(
  '/quotes',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const { items, totalCount } = await salesQuoteService.list(
      {
        status: req.query.status as string | undefined,
        countryId: req.query.countryId ? Number(req.query.countryId) : undefined,
        agentId: req.query.agentId ? Number(req.query.agentId) : undefined,
      },
      skip,
      limit,
    );
    return paginated(res, items, { page, limit, totalCount });
  }),
);

salesRoutes.get(
  '/quotes/:id',
  asyncHandler(async (req, res) => ok(res, await salesQuoteService.getDetail(Number(req.params.id)))),
);

salesRoutes.get(
  '/quotes/:id/download',
  asyncHandler(async (req, res) => {
    const { url } = await salesQuoteService.download(Number(req.params.id));
    return res.redirect(url);
  }),
);

salesRoutes.get(
  '/quotes/:id/messages',
  asyncHandler(async (req, res) => ok(res, await quoteMessageService.listForSales(Number(req.params.id), req.query.includeInternal === 'true'))),
);

salesRoutes.post(
  '/quotes/:id/messages',
  validate(z.object({ message: z.string().min(1).max(2000), isInternal: z.boolean().optional() })),
  asyncHandler(async (req, res) =>
    ok(res, await quoteMessageService.createForSales(Number(req.params.id), req.user!.id, req.body.message, req.body.isInternal === true)),
  ),
);

salesRoutes.post(
  '/quotes/:id/claim',
  asyncHandler(async (req, res) => ok(res, await salesQuoteService.claim(Number(req.params.id), req.user!.id))),
);

salesRoutes.put(
  '/quotes/:id/items',
  validate(setPricesSchema),
  asyncHandler(async (req, res) => ok(res, await salesQuoteService.setPrices(Number(req.params.id), req.body.items, req.user!.id))),
);

salesRoutes.put(
  '/quotes/:id/status',
  validate(quoteStatusSchema),
  asyncHandler(async (req, res) =>
    ok(res, await salesQuoteService.updateStatus(Number(req.params.id), req.body.status, req.body.note, req.user!.id)),
  ),
);

salesRoutes.post(
  '/quotes/:id/invoice',
  asyncHandler(async (req, res) => ok(res, await salesQuoteService.generateInvoice(Number(req.params.id), req.user!.id))),
);
