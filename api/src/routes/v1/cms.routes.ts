/** Public CMS reads — banners (by placement) + legal pages (by slug). */
import { Router } from 'express';
import { cmsService } from '../../services/cms.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { testimonialService } from '../../services/testimonial.service';
import { siteSettingsService } from '../../services/siteSettings.service';
import { mediaService } from '../../services/media.service';

export const cmsRoutes = Router();

cmsRoutes.get(
  '/banners',
  asyncHandler(async (req, res) => {
    const placement = String(req.query.placement ?? '').trim();
    if (!placement) throw AppError.badRequest('MISSING_PLACEMENT', 'placement query param is required.');
    const countryId = req.context?.countryId;
    return ok(res, await cmsService.publicBanners(placement, countryId));
  }),
);

cmsRoutes.get(
  '/legal/:slug',
  asyncHandler(async (req, res) => ok(res, await cmsService.publicLegalPage(req.params.slug))),
);

cmsRoutes.get(
  '/testimonials',
  asyncHandler(async (req, res) => ok(res, await testimonialService.publicList(req.context?.countryId))),
);

cmsRoutes.get(
  '/settings/site',
  asyncHandler(async (_req, res) => ok(res, await siteSettingsService.publicSettings())),
);

cmsRoutes.get(
  '/countries/current',
  asyncHandler(async (req, res) => ok(res, req.context)),
);

cmsRoutes.get(
  '/media/:id/file',
  asyncHandler(async (req, res) => {
    const downloadUrl = await mediaService.downloadUrl(Number(req.params.id));
    return res.redirect(downloadUrl);
  }),
);
