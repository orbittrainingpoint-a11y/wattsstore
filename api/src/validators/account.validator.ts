import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
  newsletterOptIn: z.boolean().optional(),
});

export const addressSchema = z.object({
  addressLabel: z.string().max(50).optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  companyName: z.string().max(150).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  countryCode: z.string().length(2),
  phone: z.string().max(30).optional(),
});

export const wishlistSchema = z.object({ productId: z.number().int().positive() });
