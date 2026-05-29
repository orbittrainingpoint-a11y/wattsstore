/** Auth routes (PRD §8.1). authLimiter applied to all (10 req / 15 min / IP). */
import { Router } from 'express';
import { authController } from '../../controllers/auth.controller';
import { authLimiter } from '../../middlewares/rateLimit.middleware';
import { requireAuth } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../../validators/auth.validator';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
authRoutes.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
authRoutes.post('/logout', asyncHandler(authController.logout));
authRoutes.post('/refresh', asyncHandler(authController.refresh));
authRoutes.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRoutes.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRoutes.get('/verify-email/:token', asyncHandler(authController.verifyEmail));
authRoutes.get('/me', asyncHandler(authController.me));
authRoutes.put(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword),
);
