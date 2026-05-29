/** Zod request validation. Strips unknown fields; surfaces first error as an AppError. */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

type Target = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, target: Target = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const first = result.error.errors[0];
      throw AppError.badRequest(
        'VALIDATION_ERROR',
        first?.message ?? 'Invalid request payload.',
        first?.path?.join('.'),
      );
    }
    // Replace with parsed (and coerced/stripped) data.
    req[target] = result.data as never;
    next();
  };
