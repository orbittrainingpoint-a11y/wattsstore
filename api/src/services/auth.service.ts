/**
 * Authentication service (PRD §9). Owns all auth business logic:
 * registration, login (+brute-force lock), JWT issuance, refresh rotation,
 * email verification, password reset, password change.
 */
import bcrypt from 'bcryptjs';
import { addDays, addHours } from 'date-fns';
import { userRepository } from '../repositories/user.repository';
import { notificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import {
  generateOpaqueToken,
  generateRefreshToken,
  hashToken,
  signAccessToken,
} from '../utils/jwt';
import { AuthUser } from '../types/express';
import { RegisterInput } from '../validators/auth.validator';

const MAX_FAILED_ATTEMPTS = 5;       // per (email, IP) in LOCK_WINDOW_MIN
const LOCK_WINDOW_MIN = 15;
const MAX_FAILED_BY_EMAIL = 20;      // per email across all IPs in EMAIL_LOCK_WINDOW_MIN
const EMAIL_LOCK_WINDOW_MIN = 60;

function toAuthUser(u: {
  id: number;
  email: string;
  role: string;
  isEmailVerified: boolean;
}): AuthUser {
  return { id: u.id, email: u.email, role: u.role as AuthUser['role'], isEmailVerified: u.isEmailVerified };
}

export const authService = {
  async register(input: RegisterInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw AppError.conflict('EMAIL_TAKEN', 'An account with this email already exists.', 'email');

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_COST);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
    });

    await this.sendVerificationEmail(user.id, user.email, user.firstName);
    return { id: user.id, email: user.email };
  },

  async sendVerificationEmail(userId: number, email: string, firstName: string) {
    const token = generateOpaqueToken();
    await userRepository.createAuthToken({
      userId,
      token,
      tokenType: 'email_verification',
      expiresAt: addHours(new Date(), 24),
    });
    await notificationService.queueEmail({
      template: 'email-verification',
      recipient: email,
      subject: 'Verify your WattsStore email',
      notificationType: 'email_verification',
      userId,
      data: {
        firstName,
        verifyUrl: `${env.FRONTEND_URL}/auth/verify-email?token=${token}`,
      },
    });
  },

  async login(email: string, password: string, ip: string, userAgent?: string) {
    // Brute-force lock (PRD §9.2). Two layers:
    //   1. per (email, IP) — catches simple repeat attempts.
    //   2. per email across all IPs — catches credential-stuffing via rotating IPs.
    const [failedPair, failedEmail] = await Promise.all([
      userRepository.countRecentFailedAttempts(email, ip, LOCK_WINDOW_MIN),
      userRepository.countRecentFailedByEmail(email, EMAIL_LOCK_WINDOW_MIN),
    ]);
    if (failedPair >= MAX_FAILED_ATTEMPTS) {
      throw new AppError(429, 'ACCOUNT_LOCKED', 'Too many failed login attempts. Please try again in 30 minutes.');
    }
    if (failedEmail >= MAX_FAILED_BY_EMAIL) {
      throw new AppError(429, 'ACCOUNT_LOCKED_EMAIL', 'This account is temporarily locked due to repeated failed attempts. Please reset your password.');
    }

    const user = await userRepository.findByEmail(email);
    const valid = user && (await bcrypt.compare(password, user.passwordHash));

    if (!user || !valid) {
      await userRepository.recordLoginAttempt(email, ip, false);
      throw AppError.badRequest('INVALID_CREDENTIALS', 'Invalid email or password.');
    }
    if (!user.isActive) {
      throw AppError.forbidden('This account has been deactivated. Contact support.');
    }

    await userRepository.recordLoginAttempt(email, ip, true);
    await userRepository.update(user.id, { lastLoginAt: new Date(), lastLoginIp: ip });

    const tokens = await this.issueTokens(toAuthUser(user), userAgent);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  },

  /** Issue access JWT + persist hashed refresh token. */
  async issueTokens(user: AuthUser, deviceInfo?: string) {
    const accessToken = signAccessToken(user);
    const { token: refreshToken, hash } = generateRefreshToken();
    await userRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hash,
      deviceInfo,
      expiresAt: addDays(new Date(), env.REFRESH_TOKEN_TTL_DAYS),
    });
    return { accessToken, refreshToken };
  },

  /** Validate + rotate refresh token. Old token revoked, new one issued. */
  async refresh(refreshToken: string, deviceInfo?: string) {
    const hash = hashToken(refreshToken);
    const record = await userRepository.findRefreshToken(hash);
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw AppError.unauthorized('Session expired. Please log in again.');
    }
    const user = await userRepository.findById(record.userId);
    if (!user || !user.isActive) throw AppError.unauthorized();

    await userRepository.revokeRefreshToken(record.id);
    const tokens = await this.issueTokens(toAuthUser(user), deviceInfo);
    return tokens;
  },

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    const record = await userRepository.findRefreshToken(hashToken(refreshToken));
    if (record && !record.revokedAt) await userRepository.revokeRefreshToken(record.id);
  },

  async verifyEmail(token: string) {
    const record = await userRepository.findValidAuthToken(token, 'email_verification');
    if (!record) throw AppError.badRequest('INVALID_TOKEN', 'This verification link is invalid or has expired.');
    await userRepository.update(record.userId, { isEmailVerified: true });
    await userRepository.markAuthTokenUsed(record.id);
  },

  /** Always returns success message — prevents email enumeration (PRD §9.3). */
  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (user) {
      const token = generateOpaqueToken();
      await userRepository.createAuthToken({
        userId: user.id,
        token,
        tokenType: 'password_reset',
        expiresAt: addHours(new Date(), 1),
      });
      await notificationService.queueEmail({
        template: 'password-reset',
        recipient: user.email,
        subject: 'Reset your WattsStore password',
        notificationType: 'password_reset',
        userId: user.id,
        data: {
          firstName: user.firstName,
          resetUrl: `${env.FRONTEND_URL}/auth/reset-password?token=${token}`,
        },
      });
    }
  },

  async resetPassword(token: string, newPassword: string) {
    const record = await userRepository.findValidAuthToken(token, 'password_reset');
    if (!record) throw AppError.badRequest('INVALID_TOKEN', 'This reset link is invalid or has expired.');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_COST);
    await userRepository.update(record.userId, { passwordHash });
    await userRepository.markAuthTokenUsed(record.id);
    await userRepository.revokeAllRefreshTokens(record.userId); // force re-login everywhere
  },

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized();
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw AppError.badRequest('INVALID_CREDENTIALS', 'Current password is incorrect.', 'currentPassword');

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_COST);
    await userRepository.update(userId, { passwordHash });
    await userRepository.revokeAllRefreshTokens(userId);
  },
};
