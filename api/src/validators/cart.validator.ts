import { z } from 'zod';

export const addItemSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(9999),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().min(0).max(9999),
});

export const couponSchema = z.object({
  code: z.string().min(1).max(50),
});
