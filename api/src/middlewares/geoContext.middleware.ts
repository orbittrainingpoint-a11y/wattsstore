/**
 * Reads NGINX X-Geo-Country-Code header → resolves to a Country row → attaches req.context.
 * Result cached in Redis 10 min (TSD §13.2). Falls back to the default/global country.
 */
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { cacheGet, cacheSet } from '../config/redis';
import { GeoContext } from '../types/express';

const DEFAULT_COUNTRY_CODE = 'AE'; // UAE is the primary market
const CACHE_TTL = 10 * 60;

async function resolveCountry(code: string): Promise<GeoContext | null> {
  const cacheKey = `geo:country:${code}`;
  const cached = await cacheGet<GeoContext>(cacheKey);
  if (cached) return cached;

  const country = await prisma.country.findFirst({
    where: { countryCode: code, isActive: true },
    select: { id: true, countryCode: true, currencyCode: true, currencySymbol: true },
  });
  if (!country) return null;

  const ctx: GeoContext = {
    countryId: country.id,
    countryCode: country.countryCode,
    currencyCode: country.currencyCode,
    currencySymbol: country.currencySymbol,
  };
  await cacheSet(cacheKey, ctx, CACHE_TTL);
  return ctx;
}

export async function geoContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    // Priority: explicit ?country= slug from frontend region routing, else NGINX header, else default.
    const headerCode = (req.header('X-Geo-Country-Code') || '').toUpperCase();
    const queryCode = (req.query.country as string | undefined)?.toUpperCase();
    const candidate = queryCode || headerCode || DEFAULT_COUNTRY_CODE;

    const ctx =
      (await resolveCountry(candidate)) ??
      (await resolveCountry(DEFAULT_COUNTRY_CODE));

    if (ctx) {
      req.context = ctx;
    }
    next();
  } catch (err) {
    next(err);
  }
}
