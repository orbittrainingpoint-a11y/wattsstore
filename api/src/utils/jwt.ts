/** JWT access-token signing/verification + HttpOnly cookie helpers (PRD §9.1, TSD §7.1-7.2). */
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { CookieOptions, Response } from 'express';
import { env, isProd } from '../config/env';
import { AuthUser } from '../types/express';

export const ACCESS_COOKIE = 'ws_access';
export const REFRESH_COOKIE = 'ws_refresh';

export interface AccessPayload {
  sub: number;
  email: string;
  role: AuthUser['role'];
  emailVerified: boolean;
}

export function signAccessToken(user: AuthUser): string {
  const payload: AccessPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    emailVerified: user.isEmailVerified,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as SignOptions);
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as unknown as AccessPayload;
}

/** Refresh token: 64-byte random hex; only the SHA-256 hash is stored in the DB. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(64).toString('hex');
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Random opaque token for email verification / password reset (PRD §9.3). */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const baseCookie: CookieOptions = {
  httpOnly: true,
  secure: isProd, // HTTPS-only in production
  sameSite: 'strict', // CSRF protection (PRD §9.2)
  domain: env.COOKIE_DOMAIN,
  path: '/',
};

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseCookie, maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, baseCookie);
  res.clearCookie(REFRESH_COOKIE, baseCookie);
}
