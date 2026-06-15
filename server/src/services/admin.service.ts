import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { Role } from '@prisma/client';

export const AdminService = {
  async getUsers(page: number, limit: number, search?: string, role?: Role) {
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async updateUserRole(userId: string, newRole: Role, adminId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');

    if (user.role === newRole) return user;

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: { id: true, email: true, role: true, firstName: true, lastName: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'UPDATE_ROLE',
          entity: 'User',
          entityId: userId,
          oldValues: { role: user.role },
          newValues: { role: newRole },
          ipAddress,
          userAgent,
        },
      });

      return updatedUser;
    });
  },

  async updateDoctorVerification(doctorId: string, isVerified: boolean, notes?: string) {
    return prisma.user.update({
      where: { id: doctorId },
      data: { isVerified },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, isVerified: true },
    });
  },

  async softDeleteUser(userId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');
    if (user.deletedAt) return user;

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { deletedAt: new Date(), isActive: false },
        select: { id: true, email: true, role: true, firstName: true, lastName: true, deletedAt: true },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'SOFT_DELETE',
          entity: 'User',
          entityId: userId,
          oldValues: { deletedAt: null, isActive: user.isActive },
          newValues: { deletedAt: new Date(), isActive: false },
          ipAddress,
          userAgent,
        },
      });

      return updatedUser;
    });
  },

  async getAuditLogs(page: number, limit: number, entity?: string, action?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getSystemAnalytics() {
    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      totalMedicines,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'DOCTOR', deletedAt: null } }),
      prisma.user.count({ where: { role: 'PATIENT', deletedAt: null } }),
      prisma.appointment.count(),
      prisma.medicine.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return {
      totalUsers,
      totalDoctors,
      totalPatients,
      totalAppointments,
      totalMedicines,
      recentLogs24h: recentLogs,
    };
  },
};
