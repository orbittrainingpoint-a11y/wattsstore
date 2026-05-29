/** Admin settings (key-value) + admin user management (PRD §14, §8.12). Mounted at /admin/settings. */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../../config/database';
import { validate } from '../../../middlewares/validate.middleware';
import { requireRole } from '../../../middlewares/auth.middleware';
import { asyncHandler } from '../../../utils/asyncHandler';
import { ok, created } from '../../../utils/response';
import { env } from '../../../config/env';
import { DEFAULT_ORDER_DOCUMENT_SETTINGS } from '../../../services/orderDocumentSettings.service';

export const adminSettingsRoutes = Router();
const settingSchemas = {
  announcementBar: z.object({ enabled: z.boolean(), items: z.array(z.string().min(1).max(160)).max(12) }),
  contact: z.object({
    phone: z.string().max(40),
    whatsapp: z.string().max(40),
    email: z.string().email(),
    salesEmail: z.string().email(),
    headquarters: z.string().max(200),
  }),
  trustBadges: z.array(z.object({ label: z.string().min(1).max(80), image: z.string().max(500).optional() })).max(12),
  footer: z.object({
    description: z.string().max(500),
    social: z.record(z.string().url().or(z.literal(''))),
    certifications: z.array(z.string().min(1).max(60)).max(12),
  }),
  offerPopup: z.object({
    enabled: z.boolean(),
    title: z.string().max(120),
    body: z.string().max(500),
    ctaLabel: z.string().max(60),
    ctaUrl: z.string().max(500),
    frequencyHours: z.number().int().min(1).max(720),
  }),
  quoteAutomation: z.object({
    enabled: z.boolean(),
    autoSend: z.boolean(),
    maxAutoValue: z.number().nonnegative(),
    validityDays: z.number().int().min(1).max(90),
    discountTiers: z.array(z.object({
      minQuantity: z.number().int().positive(),
      discountPercent: z.number().min(0).max(50),
    })).max(10),
  }),
  orderDocuments: z.object({
    autoGenerateInvoiceOnOrder: z.boolean(),
    autoGenerateCourierReceiptOnShipment: z.boolean(),
    defaultCourier: z.string().min(1).max(80),
    receiptFooter: z.string().max(500),
    showPricesOnCourierReceipt: z.boolean(),
  }).default(DEFAULT_ORDER_DOCUMENT_SETTINGS),
  taxSettings: z.object({
    countryRates: z.array(z.object({
      countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
      taxClass: z.string().min(1).max(50).default('standard'),
      taxRate: z.number().min(0).max(100),
      taxLabel: z.string().min(1).max(50).default('VAT'),
      isInclusive: z.boolean().default(false),
    })).max(250),
  }),
  shippingRates: z.object({
    countryRates: z.array(z.object({
      countryCode: z.string().length(2).transform((value) => value.toUpperCase()),
      flatRate: z.number().min(0).optional(),
      freeOver: z.number().min(0).optional(),
      baseRate: z.number().min(0).optional(),
      perKgRate: z.number().min(0).optional(),
      estimatedDays: z.string().min(1).max(80).optional(),
    })).max(250),
  }),
  localization: z.object({
    autoDetectCountry: z.boolean(),
    defaultRegion: z.string().min(2).max(20),
    supportedLanguages: z.array(z.object({ code: z.string().min(2).max(10), label: z.string().min(1).max(60) })).max(30),
  }),
} as const;

adminSettingsRoutes.get('/', asyncHandler(async (_req, res) => {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return ok(res, map);
}));

adminSettingsRoutes.put(
  '/:key',
  validate(z.object({ value: z.any() })),
  asyncHandler(async (req, res) => {
    const key = req.params.key as keyof typeof settingSchemas;
    const schema = settingSchemas[key];
    if (!schema) return res.status(400).json({ success: false, error: { code: 'INVALID_SETTING_KEY', message: 'Unknown site setting.' } });
    const value = schema.parse(req.body.value);
    const setting = await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return ok(res, setting);
  }),
);

// ── Admin user management — super_admin only ──
adminSettingsRoutes.get(
  '/staff/list',
  requireRole('super_admin'),
  asyncHandler(async (_req, res) =>
    ok(res, await prisma.user.findMany({ where: { role: { in: ['sales_agent', 'admin', 'super_admin'] } }, select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true } })),
  ),
);

adminSettingsRoutes.post(
  '/staff',
  requireRole('super_admin'),
  validate(z.object({ email: z.string().email(), password: z.string().min(8), firstName: z.string().min(1), lastName: z.string().min(1), role: z.enum(['sales_agent', 'admin', 'super_admin']) })),
  asyncHandler(async (req, res) => {
    const passwordHash = await bcrypt.hash(req.body.password, env.BCRYPT_COST);
    const user = await prisma.user.create({ data: { email: req.body.email, passwordHash, firstName: req.body.firstName, lastName: req.body.lastName, role: req.body.role, isEmailVerified: true } });
    return created(res, { id: user.id, email: user.email, role: user.role });
  }),
);

adminSettingsRoutes.put(
  '/staff/:id/role',
  requireRole('super_admin'),
  validate(z.object({ role: z.enum(['customer', 'sales_agent', 'admin', 'super_admin']) })),
  asyncHandler(async (req, res) => ok(res, await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role: req.body.role }, select: { id: true, role: true } }))),
);
