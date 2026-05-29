/** Thin HTTP layer for auth — delegates to authService, manages cookies. */
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { ok, created } from '../utils/response';
import { AppError } from '../utils/AppError';
import { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from '../utils/jwt';
import { env } from '../config/env';

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    return created(res, { ...result, message: 'Registration successful. Please verify your email.' });
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body;
    const ip = req.ip ?? '0.0.0.0';
    const result = await authService.login(email, password, ip, req.headers['user-agent']);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return ok(res, { user: result.user });
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    return ok(res, { message: 'Logged out.' });
  },

  async refresh(req: Request, res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw AppError.unauthorized();
    const tokens = await authService.refresh(token, req.headers['user-agent']);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return ok(res, { message: 'Token refreshed.' });
  },

  async forgotPassword(req: Request, res: Response) {
    await authService.forgotPassword(req.body.email);
    return ok(res, { message: 'If your email is registered, you will receive a reset link.' });
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    return ok(res, { message: 'Password reset. Please log in.' });
  },

  async verifyEmail(req: Request, res: Response) {
    await authService.verifyEmail(req.params.token);
    // Redirect back to login with success flag (PRD §8.1).
    return res.redirect(`${env.FRONTEND_URL}/auth/login?verified=true`);
  },

  async me(req: Request, res: Response) {
    if (!req.user) return ok(res, null);
    const user = await userRepository.findById(req.user!.id);
    if (!user) throw AppError.unauthorized();
    return ok(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      newsletterOptIn: user.newsletterOptIn,
    });
  },

  async changePassword(req: Request, res: Response) {
    await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
    clearAuthCookies(res); // force re-login
    return ok(res, { message: 'Password changed. Please log in again.' });
  },
};
