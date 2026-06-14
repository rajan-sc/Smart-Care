import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/apiError.js';
import { Role, TokenType } from '@prisma/client';
import { EmailService } from './email.service.js';

export interface TokenResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

export const AuthService = {
  async generateTokens(user: any): Promise<TokenResponse> {
    const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: '15m' });

    const refreshTokenStr = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshTokenStr,
        expiresAt,
      },
    });

    return {
      user,
      accessToken,
      refreshToken: refreshTokenStr,
    };
  },

  async register(data: any, ipAddress?: string, userAgent?: string): Promise<TokenResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw AppError.conflict('Email is already registered', 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(data.password, 8);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: data.role,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          isVerified: false,
        },
      });

      if (data.role === Role.DOCTOR) {
        await tx.doctorProfile.create({
          data: {
            userId: createdUser.id,
            specialization: 'General Medicine',
            clinicName: 'SmartCare Clinic',
            consultationFee: 0.0,
            avgConsultationMinutes: 15,
          },
        });
      }

      return createdUser;
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        newValues: { email: user.email, role: user.role },
        ipAddress,
        userAgent,
      },
    });

    return this.generateTokens(user);
  },

  async login(data: any, ipAddress?: string, userAgent?: string): Promise<TokenResponse> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || user.deletedAt) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return this.generateTokens(user);
  },

  async refresh(refreshTokenStr: string): Promise<TokenResponse> {
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: { user: true },
    });

    // Security Breach Mitigation: Reuse or Revocation Detection
    if (dbToken && (dbToken.isRevoked || dbToken.expiresAt < new Date())) {
      await prisma.refreshToken.updateMany({
        where: { userId: dbToken.userId, isRevoked: false },
        data: { isRevoked: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: dbToken.userId,
          action: 'SECURITY_ALERT',
          entity: 'RefreshToken',
          entityId: dbToken.id,
          newValues: { message: 'Refresh token reuse detected. All user tokens revoked.' },
        },
      });

      throw AppError.unauthorized(
        'This session has been terminated due to security detection of token reuse.',
        'TOKEN_REUSE_DETECTED',
      );
    }

    if (!dbToken) {
      throw AppError.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
    }

    if (dbToken.user.deletedAt || !dbToken.user.isActive) {
      throw AppError.forbidden('Your account is deactivated', 'ACCOUNT_DEACTIVATED');
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: dbToken.id },
      data: { isRevoked: true },
    });

    return this.generateTokens(dbToken.user);
  },

  async logout(refreshTokenStr: string): Promise<void> {
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
    });

    if (dbToken) {
      await prisma.refreshToken.update({
        where: { id: dbToken.id },
        data: { isRevoked: true },
      });
    }
  },

  async changePassword(userId: string, data: any): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized('Incorrect current password', 'INCORRECT_PASSWORD');
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 8);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
      });

      await tx.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    });
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  },

  async forgotPassword(email: string, ipAddress?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      // Don't leak if user exists
      return;
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: TokenType.RESET_PASSWORD,
        expiresAt,
      },
    });

    await EmailService.sendPasswordReset(user.email, user.firstName, token);
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'FORGOT_PASSWORD',
        entity: 'User',
        entityId: user.id,
        ipAddress,
      },
    });
  },

  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    const verification = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification || verification.isUsed || verification.expiresAt < new Date() || verification.type !== TokenType.RESET_PASSWORD) {
      throw AppError.badRequest('Invalid or expired token', 'INVALID_TOKEN');
    }

    const passwordHash = await bcrypt.hash(newPassword, 8);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verification.userId },
        data: { passwordHash },
      });

      await tx.verificationToken.update({
        where: { id: verification.id },
        data: { isUsed: true },
      });

      // Revoke all refresh tokens to force login
      await tx.refreshToken.updateMany({
        where: { userId: verification.userId, isRevoked: false },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          userId: verification.userId,
          action: 'RESET_PASSWORD',
          entity: 'User',
          entityId: verification.userId,
          ipAddress,
        },
      });
    });
  },

  async requestVerificationEmail(userId: string, ipAddress?: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw AppError.notFound('User not found');
    }
    if (user.isVerified) {
      throw AppError.badRequest('Email is already verified');
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        type: TokenType.VERIFY_EMAIL,
        expiresAt,
      },
    });

    await EmailService.sendVerificationEmail(user.email, user.firstName, token);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REQUEST_VERIFICATION',
        entity: 'User',
        entityId: user.id,
        ipAddress,
      },
    });
  },

  async verifyEmail(token: string, ipAddress?: string): Promise<void> {
    const verification = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification || verification.isUsed || verification.expiresAt < new Date() || verification.type !== TokenType.VERIFY_EMAIL) {
      throw AppError.badRequest('Invalid or expired token', 'INVALID_TOKEN');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: verification.userId },
        data: { isVerified: true },
      });

      await tx.verificationToken.update({
        where: { id: verification.id },
        data: { isUsed: true },
      });

      await tx.auditLog.create({
        data: {
          userId: verification.userId,
          action: 'VERIFY_EMAIL',
          entity: 'User',
          entityId: verification.userId,
          ipAddress,
        },
      });
    });
  },
};
