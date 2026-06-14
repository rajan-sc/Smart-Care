import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../src/services/auth.service.js';
import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

vi.mock('../src/lib/prisma.js', () => {
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    doctorProfile: {
      create: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(mockPrisma)),
  };
  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

describe('AuthService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should throw unauthorized error if email is not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        AuthService.login({ email: 'nonexistent@smartcare.dev', password: 'password' }),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        }),
      );
    });

    it('should throw unauthorized error if password does not match', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@smartcare.dev',
        passwordHash: await bcrypt.hash('correct_password', 8),
        role: 'PATIENT',
        isActive: true,
        deletedAt: null,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      await expect(
        AuthService.login({ email: 'user@smartcare.dev', password: 'wrong_password' }),
      ).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        }),
      );
    });
  });

  describe('refresh', () => {
    it('should revoke all tokens and throw error if refresh token is already revoked', async () => {
      const mockToken = {
        id: 'token-1',
        userId: 'user-1',
        token: 'revoked-token',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        user: {
          email: 'user@smartcare.dev',
          role: 'PATIENT',
        },
      };

      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue(mockToken as any);
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 5 } as any);

      await expect(AuthService.refresh('revoked-token')).rejects.toThrow(
        expect.objectContaining({
          statusCode: 401,
          code: 'TOKEN_REUSE_DETECTED',
        }),
      );

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRevoked: false },
        }),
      );
    });
  });
});
