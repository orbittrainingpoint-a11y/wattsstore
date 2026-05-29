/** JWT auth + RBAC role guard (PRD §9.5). */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ACCESS_COOKIE, verifyAccessToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { UserRole } from '../types/roles';

/** Populates req.user if a valid access token cookie is present; never throws. Use for optional auth. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        isEmailVerified: payload.emailVerified,
      };
    } catch {
      // expired/invalid — leave req.user undefined; frontend will hit /auth/refresh
    }
  }
  next();
}

/** Hard requirement: 401 if not authenticated. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw AppError.unauthorized();
  next();
}

/** RBAC: allow only the given roles. */
export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };

/** Convenience guards. */
export const requireAdmin = requireRole('admin', 'super_admin');
export const requireSales = requireRole('sales_agent', 'admin', 'super_admin');

/** Block actions that require a verified email (e.g. checkout — PRD §9.4). */
export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) throw AppError.unauthorized();
  if (!req.user.isEmailVerified) {
    throw AppError.forbidden('Please verify your email address before placing an order.');
  }
  next();
}
