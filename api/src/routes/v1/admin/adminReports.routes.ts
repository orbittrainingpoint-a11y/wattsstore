/** Admin dashboard + reports (PRD §8.12, §14.1, §14.6). Mounted at /admin/reports. */
import { Router } from 'express';
import { reportsService } from '../../../services/admin/reports.service';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok } from '../../../utils/response';
import { subDays } from 'date-fns';

export const adminReportsRoutes = Router();

adminReportsRoutes.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const countryId = req.query.countryId ? Number(req.query.countryId) : undefined;
    const [kpis, series, topProducts, lowStock, funnel, ops] = await Promise.all([
      reportsService.dashboard(countryId),
      reportsService.salesSeries(subDays(new Date(), 30), new Date(), countryId),
      reportsService.topProducts(10),
      reportsService.lowStock(countryId),
      reportsService.conversionFunnel(30, countryId),
      reportsService.opsHealth(),
    ]);
    return ok(res, { kpis, series, topProducts, lowStock, funnel, ops });
  }),
);

adminReportsRoutes.get(
  '/sales',
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : subDays(new Date(), 30);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const countryId = req.query.countryId ? Number(req.query.countryId) : undefined;
    return ok(res, await reportsService.salesSeries(from, to, countryId));
  }),
);

adminReportsRoutes.get(
  '/inventory',
  asyncHandler(async (req, res) =>
    ok(res, await reportsService.lowStock(req.query.countryId ? Number(req.query.countryId) : undefined)),
  ),
);

adminReportsRoutes.get(
  '/funnel',
  asyncHandler(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : 30;
    const countryId = req.query.countryId ? Number(req.query.countryId) : undefined;
    return ok(res, await reportsService.conversionFunnel(days, countryId));
  }),
);

adminReportsRoutes.get(
  '/ops-health',
  asyncHandler(async (_req, res) => ok(res, await reportsService.opsHealth())),
);
