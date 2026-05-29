import { z } from 'zod';

export const shippingAddressSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(150).optional(),
  addressLine1: z.string().min(1).max(255),
  addressLine2: z.string().max(255).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  countryCode: z.string().length(2),
  phone: z.string().max(30).optional(),
});

export const createOrderSchema = z.object({
  shipping: shippingAddressSchema,
  paymentGateway: z.enum(['stripe', 'bank_transfer']),
  customerNotes: z.string().max(2000).optional(),
});
