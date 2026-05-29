/** Standard API response envelopes (PRD §7.3). */
import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function paginated<T>(
  res: Response,
  data: T[],
  meta: { page: number; limit: number; totalCount: number },
  extras?: Record<string, unknown>,
): Response {
  return res.status(200).json({
    success: true,
    data,
    meta: {
      ...meta,
      totalPages: Math.max(1, Math.ceil(meta.totalCount / meta.limit)),
    } satisfies PaginationMeta,
    ...(extras ?? {}),
  });
}

export function created<T>(res: Response, data: T): Response {
  return ok(res, data, 201);
}

/** Parse & clamp pagination query params. */
export function parsePagination(query: Record<string, unknown>, defaultLimit = 24, maxLimit = 100) {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
