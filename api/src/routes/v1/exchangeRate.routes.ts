/** Public exchange rate endpoint. Returns live rates with margin already applied. */
import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ok } from '../../utils/response';
import { exchangeRateService } from '../../services/exchangeRate.service';
import { prisma } from '../../config/database';

export const exchangeRateRoutes = Router();

exchangeRateRoutes.get(
  '/exchange-rates',
  asyncHandler(async (_req, res) => {
    // Read the admin-configured currency display setting to get marginPct
    const setting = await prisma.setting.findUnique({ where: { key: 'currencyDisplay' } });
    const cfg = (setting?.value ?? {}) as { enabled?: boolean; baseCurrency?: string; marginPct?: number };
    const marginPct = typeof cfg.marginPct === 'number' ? cfg.marginPct : 2.5;
    const enabled = cfg.enabled !== false; // default on if setting exists

    const rates = await exchangeRateService.getRates(marginPct);
    return ok(res, {
      ...rates,
      enabled,
      baseCurrency: cfg.baseCurrency ?? 'USD',
    });
  }),
);
