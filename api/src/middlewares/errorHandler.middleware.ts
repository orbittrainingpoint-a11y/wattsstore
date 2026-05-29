/** Centralised error handler → consistent JSON envelope (PRD §7.3). Last middleware mounted. */
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { logger } from '../config/logger';
import { isProd } from '../config/env';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: `Cannot ${req.method} ${req.path}` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Known operational error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.field ? { field: err.field } : {}) },
    });
    return;
  }

  // Prisma known errors → friendly mapping
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'A record with these details already exists.' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found.' } });
      return;
    }
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Unhandled error', {
    message,
    stack: err instanceof Error ? err.stack : undefined,
    path: req.originalUrl,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'An unexpected error occurred.' : message,
    },
  });
}
