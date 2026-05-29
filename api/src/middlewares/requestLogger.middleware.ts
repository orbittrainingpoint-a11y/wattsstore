/** Logs method, path, status, response time, IP, user (PRD §7.2 step 5). */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms * 100) / 100,
      ip: req.ip,
      userId: req.user?.id ?? null,
    });
  });
  next();
}
