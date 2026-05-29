/** Admin back-office routes. All require admin/super_admin + admin rate limit + audit logging. */
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../../../middlewares/auth.middleware';
import { adminLimiter } from '../../../middlewares/rateLimit.middleware';
import { adminCatalogRoutes } from './adminCatalog.routes';
import { adminOrdersRoutes } from './adminOrders.routes';
import { adminInventoryRoutes } from './adminInventory.routes';
import { adminMarketingRoutes } from './adminMarketing.routes';
import { adminContentRoutes } from './adminContent.routes';
import { adminCustomersRoutes } from './adminCustomers.routes';
import { adminReportsRoutes } from './adminReports.routes';
import { adminSettingsRoutes } from './adminSettings.routes';
import { adminOpsRoutes } from './adminOps.routes';

export const adminRoutes = Router();
adminRoutes.use(requireAuth, requireAdmin, adminLimiter);

adminRoutes.use(adminCatalogRoutes);
adminRoutes.use(adminOrdersRoutes);
adminRoutes.use(adminInventoryRoutes);
adminRoutes.use(adminMarketingRoutes);
adminRoutes.use(adminContentRoutes);
adminRoutes.use(adminCustomersRoutes);
adminRoutes.use(adminOpsRoutes);
adminRoutes.use('/reports', adminReportsRoutes);
adminRoutes.use('/settings', adminSettingsRoutes);
