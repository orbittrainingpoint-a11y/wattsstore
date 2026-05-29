/** Prisma query layer for users & auth tokens (no business logic). */
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  },

  update(id: number, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data });
  },

  // ── Auth tokens (email verification / password reset) ──
  createAuthToken(data: Prisma.AuthTokenUncheckedCreateInput) {
    return prisma.authToken.create({ data });
  },

  findValidAuthToken(token: string, type: 'email_verification' | 'password_reset') {
    return prisma.authToken.findFirst({
      where: { token, tokenType: type, usedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  markAuthTokenUsed(id: number) {
    return prisma.authToken.update({ where: { id }, data: { usedAt: new Date() } });
  },

  // ── Refresh tokens ──
  createRefreshToken(data: Prisma.RefreshTokenUncheckedCreateInput) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: number) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  revokeAllRefreshTokens(userId: number) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  // ── Brute-force tracking ──
  recordLoginAttempt(email: string, ipAddress: string, successful: boolean) {
    return prisma.loginAttempt.create({ data: { email, ipAddress, successful } });
  },

  countRecentFailedAttempts(email: string, ipAddress: string, sinceMinutes: number) {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return prisma.loginAttempt.count({
      where: { email, ipAddress, successful: false, attemptedAt: { gte: since } },
    });
  },

  /** IP-independent counter — catches credential-stuffing across rotating IPs. */
  countRecentFailedByEmail(email: string, sinceMinutes: number) {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    return prisma.loginAttempt.count({
      where: { email, successful: false, attemptedAt: { gte: since } },
    });
  },
};
