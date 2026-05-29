/** Helmet security headers + CORS whitelist (PRD §9.2, TSD §15.1). */
import helmet from 'helmet';
import cors from 'cors';
import { RequestHandler } from 'express';
import { corsOrigins, isProd } from '../config/env';
import { AppError } from '../utils/AppError';

export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://js.stripe.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
      frameSrc: ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
});

export const corsMiddleware: RequestHandler = cors({
  origin(origin, callback) {
    // Allow same-origin / server-to-server (no Origin header) and whitelisted origins.
    if (!origin || corsOrigins.includes(origin)) return callback(null, true);
    return callback(AppError.forbidden(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true, // required for HttpOnly auth cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Geo-Country-Code'],
});
