import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';

export interface UpdateUserProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export const UserService = {
  async updateProfile(userId: string, data: UpdateUserProfileInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async softDeleteUser(userId: string, adminId?: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw AppError.notFound('User not found or already deleted');
    }

    await prisma.$transaction(async (tx) => {
      // Soft delete the user
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), isActive: false },
      });

      // Revoke all refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId, // Admin who performed the action
          action: 'DELETE',
          entity: 'User',
          entityId: userId,
          ipAddress,
          userAgent,
        },
      });
    });
  },
};
