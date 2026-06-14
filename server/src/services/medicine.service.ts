import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { MedicationLogStatus } from '@prisma/client';
import { CacheUtils } from '../lib/cache.js';

export const MedicineService = {
  async createSchedule(userId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.create({
        data: {
          userId,
          name: data.name,
          dosage: data.dosage,
          unit: data.unit,
          frequency: data.frequency,
          timings: data.timings,
          startDate: new Date(data.startDate),
          endDate: data.endDate ? new Date(data.endDate) : null,
          instructions: data.instructions
        }
      });

      const today = new Date();
      const startDate = new Date(data.startDate);
      if (today.toDateString() === startDate.toDateString() || today >= startDate) {
        const logsData = data.timings.map((time: string) => {
          const [hours, minutes] = time.split(':');
          const scheduledAt = new Date();
          scheduledAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          return {
            medicineId: medicine.id,
            userId,
            scheduledAt,
            status: MedicationLogStatus.PENDING
          };
        });

        if (logsData.length > 0) {
          await tx.medicationLog.createMany({
            data: logsData,
            skipDuplicates: true
          });
        }
      }

      return medicine;
    });
  },

  async deleteMedicine(id: string, userId: string) {
    const medicine = await prisma.medicine.findFirst({
      where: { id, userId }
    });
    if (!medicine) throw AppError.notFound('Medicine not found');

    await prisma.medicine.delete({
      where: { id }
    });
  },

  async updateMedicine(id: string, userId: string, data: any) {
    return prisma.$transaction(async (tx) => {
      const medicine = await tx.medicine.findFirst({
        where: { id, userId }
      });
      if (!medicine) throw AppError.notFound('Medicine not found');

      const updated = await tx.medicine.update({
        where: { id },
        data: {
          name: data.name,
          dosage: data.dosage,
          unit: data.unit,
          frequency: data.frequency,
          timings: data.timings,
          instructions: data.instructions,
        }
      });

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      await tx.medicationLog.deleteMany({
        where: {
          medicineId: id,
          status: 'PENDING',
          scheduledAt: {
            gte: startOfDay,
            lt: endOfDay
          }
        }
      });

      const startDate = new Date(medicine.startDate);
      if (today.toDateString() === startDate.toDateString() || today >= startDate) {
        const logsData = data.timings.map((time: string) => {
          const [hours, minutes] = time.split(':');
          const scheduledAt = new Date();
          scheduledAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
          return {
            medicineId: id,
            userId,
            scheduledAt,
            status: MedicationLogStatus.PENDING
          };
        });

        if (logsData.length > 0) {
          await tx.medicationLog.createMany({
            data: logsData,
            skipDuplicates: true
          });
        }
      }

      return updated;
    });
  },

  async getMedicines(userId: string) {
    return prisma.medicine.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getTodayLogs(userId: string) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0));
    const endOfDay = new Date(today.setHours(23,59,59,999));

    return prisma.medicationLog.findMany({
      where: {
        userId,
        scheduledAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        medicine: true
      },
      orderBy: { scheduledAt: 'asc' }
    });
  },

  async markTaken(logId: string, userId: string) {
    const log = await prisma.medicationLog.findUnique({ where: { id: logId } });
    if (!log || log.userId !== userId) throw AppError.notFound('Log not found');

    if (log.status === MedicationLogStatus.TAKEN) {
      return log; // Idempotency check: return without creating duplicate
    }

    const updated = await prisma.medicationLog.update({
      where: { id: logId },
      data: { status: MedicationLogStatus.TAKEN, takenAt: new Date() }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    await CacheUtils.invalidate(`analytics:${userId}:${todayStr}`);
    await CacheUtils.invalidate(`adherence:${userId}:7`);
    await CacheUtils.invalidate(`adherence:${userId}:30`);
    
    return updated;
  },

  async markSkipped(logId: string, userId: string, reason: string) {
    const log = await prisma.medicationLog.findUnique({ where: { id: logId } });
    if (!log || log.userId !== userId) throw AppError.notFound('Log not found');

    if (log.status === MedicationLogStatus.SKIPPED) return log;

    const updated = await prisma.medicationLog.update({
      where: { id: logId },
      data: { status: MedicationLogStatus.SKIPPED, notes: reason }
    });

    const todayStr = new Date().toISOString().split('T')[0];
    await CacheUtils.invalidate(`analytics:${userId}:${todayStr}`);
    await CacheUtils.invalidate(`adherence:${userId}:7`);
    await CacheUtils.invalidate(`adherence:${userId}:30`);

    return updated;
  },

  async snoozeLog(logId: string, userId: string, snoozeMinutes: number) {
    const log = await prisma.medicationLog.findUnique({ where: { id: logId } });
    if (!log || log.userId !== userId) throw AppError.notFound('Log not found');

    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeMinutes);

    return prisma.medicationLog.update({
      where: { id: logId },
      data: { status: MedicationLogStatus.SNOOZED, snoozeUntil }
    });
  }
};
