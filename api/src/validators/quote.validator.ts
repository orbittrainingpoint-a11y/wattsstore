import { z } from 'zod';

export const addQuoteItemSchema = z.object({
  variantId: z.number().int().positive(),
  targetQuantity: z.number().int().min(1).max(1_000_000),
  customerRemarks: z.string().max(1000).optional(),
});

export const updateQuoteItemSchema = z.object({
  targetQuantity: z.number().int().min(1).max(1_000_000).optional(),
  customerRemarks: z.string().max(1000).optional(),
});

export const submitRFQSchema = z.object({
  companyName: z.string().min(1).max(150),
  contactName: z.string().min(1).max(150),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(30).optional(),
  trnTaxId: z.string().max(50).optional(),
  deliveryLocation: z.string().min(1),
  urgencyLevel: z.enum(['immediate', 'within_30_days', 'within_60_days', 'planning_phase']),
  additionalNotes: z.string().max(2000).optional(),
});

export const setPricesSchema = z.object({
  items: z.array(z.object({ id: z.number().int().positive(), offeredUnitPrice: z.number().min(0) })).min(1),
});

export const quoteStatusSchema = z.object({
  status: z.enum(['under_review', 'offered', 'quotation_generating', 'invoice_sent', 'delivery_failed', 'accepted', 'rejected', 'expired']),
  note: z.string().max(1000).optional(),
});
