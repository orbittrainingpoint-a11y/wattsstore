/** Mounts all v1 route groups. */
import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { catalogRoutes } from './catalog.routes';
import { cartRoutes } from './cart.routes';
import { checkoutRoutes } from './checkout.routes';
import { orderRoutes } from './order.routes';
import { quoteRoutes } from './quote.routes';
import { accountRoutes, wishlistRoutes } from './account.routes';
import { reviewRoutes } from './review.routes';
import { contentRoutes } from './content.routes';
import { cmsRoutes } from './cms.routes';
import { webhookRoutes } from './webhook.routes';
import { salesRoutes } from './sales/salesQuote.routes';
import { adminRoutes } from './admin';
import { apiLimiter } from '../../middlewares/rateLimit.middleware';

export const v1Router = Router();

// Health check (no rate limit)
v1Router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Webhooks mounted before the general limiter (raw-body, gateway-signed)
v1Router.use('/webhooks', webhookRoutes);

// General API rate limit for everything else
v1Router.use(apiLimiter);

v1Router.use('/auth', authRoutes);
v1Router.use('/catalog', catalogRoutes);
v1Router.use('/cart', cartRoutes);
v1Router.use('/checkout', checkoutRoutes);
v1Router.use('/orders', orderRoutes);
v1Router.use('/quote', quoteRoutes);
v1Router.use('/quotes', quoteRoutes); // alias for read endpoints
v1Router.use('/account', accountRoutes);
v1Router.use('/wishlist', wishlistRoutes);
v1Router.use('/reviews', reviewRoutes);
v1Router.use('/', contentRoutes); // /blog, /faq, /community
v1Router.use('/', cmsRoutes); // /banners, /legal/:slug
v1Router.use('/sales', salesRoutes);
v1Router.use('/admin', adminRoutes);
