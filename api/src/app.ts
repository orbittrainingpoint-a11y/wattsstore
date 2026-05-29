/** Express app factory — middleware pipeline (PRD §7.2) + route mounting. */
import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import { helmetMiddleware, corsMiddleware } from './middlewares/security.middleware';
import { requestLogger } from './middlewares/requestLogger.middleware';
import { geoContext } from './middlewares/geoContext.middleware';
import { attachUser } from './middlewares/auth.middleware';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware';
import { v1Router } from './routes/v1';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1); // behind NGINX — honour X-Forwarded-For for req.ip

  // 1. Security headers
  app.use(helmetMiddleware);
  // 2. CORS
  app.use(corsMiddleware);

  /*
   * 3. Body parsing.
   * Webhook routes (/api/v1/webhooks/*) need the raw Buffer for signature verification —
   * mount express.raw FIRST on those paths so they bypass JSON parsing entirely. Other
   * routes get the standard JSON middleware.
   */
  app.use('/api/v1/webhooks', express.raw({ type: 'application/json', limit: '2mb' }), (req, _res, next) => {
    // expose the raw body where downstream code expects it, then parse to JSON for non-Stripe handlers (PayTabs IPN sends JSON).
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
      try { req.body = JSON.parse(req.body.toString('utf-8')); } catch { /* keep buffer */ }
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // 5. Request logging
  app.use(requestLogger);
  // 6. Geo context (X-Geo-Country-Code → req.context.countryId)
  app.use(geoContext);
  // 7. Optional auth — attach req.user if a valid token cookie exists
  app.use(attachUser);

  // Routes (rate-limit + role guards applied within route groups)
  app.use('/api/v1', v1Router);

  // 404 + centralised error handler (last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
