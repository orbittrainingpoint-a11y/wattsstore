/** Augments Express Request with auth user and geo context populated by middleware. */
import 'express';

export interface AuthUser {
  id: number;
  email: string;
  role: 'customer' | 'sales_agent' | 'admin' | 'super_admin';
  isEmailVerified: boolean;
}

export interface GeoContext {
  countryId: number;
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      context: GeoContext;
      rawBody?: Buffer;
    }
  }
}

export {};
