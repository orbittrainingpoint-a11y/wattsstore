/** Auth Zod schemas. Password strength enforced both client- and server-side (PRD §9.2). */
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/[0-9]/, 'Password must contain a digit.');

export const registerSchema = z.object({
  email: z.string().email('Enter a valid email address.').toLowerCase(),
  password: passwordSchema,
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required.'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
