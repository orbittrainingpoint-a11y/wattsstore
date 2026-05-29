/** Redis-backed rate limiters (PRD §9.2, TSD §7.4). Per-IP for public, per-user for admin. */
import rateLimit, { Options } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';
import { env } from '../config/env';

function makeStore(prefix: string) {
  return new RedisStore({
    prefix,
    // ioredis call signature for rate-limit-redis v4
    sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as Promise<any>,
  });
}

const errJson: Options['handler'] = (_req, res) => {
  res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down.' },
  });
};

/** Auth endpoints: strict — default 10 requests / 15 min / IP. */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MIN * 60 * 1000,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:auth:'),
  handler: errJson,
});

/** General API: default 300 requests / min / IP. */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_API_WINDOW_MIN * 60 * 1000,
  max: env.RATE_LIMIT_API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:api:'),
  handler: errJson,
});

/** Admin API: 60 requests / min, keyed by user id (falls back to IP). */
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('rl:admin:'),
  keyGenerator: (req) => (req.user ? `u:${req.user.id}` : req.ip ?? 'unknown'),
  handler: errJson,
});
