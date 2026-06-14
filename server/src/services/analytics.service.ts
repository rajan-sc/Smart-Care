import prisma from '../lib/prisma.js';
import { CacheUtils } from '../lib/cache.js';
import { Role } from '@prisma/client';

export const AnalyticsService = {
  async getDashboard(userId: string, role: Role, dateStr: string) {
    const cacheKey = `analytics:${userId}:${dateStr}`;
    const cached = await CacheUtils.get(cacheKey);
    if (cached) return cached;

    let result;
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate); startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(targetDate); endOfDay.setUTCHours(23,59,59,999);

    if (role === Role.PATIENT) {
      const logs = await prisma.medicationLog.findMany({
        where: { userId, scheduledAt: { gte: startOfDay, lte: endOfDay } }
      });
      const totalLogs = logs.length;
      const takenLogs = logs.filter(l => l.status === 'TAKEN').length;
      const adherenceRate = totalLogs > 0 ? (takenLogs / totalLogs) * 100 : 100;
      
      const delayedDoses = logs.filter(l => 
        l.status === 'TAKEN' && l.takenAt && l.takenAt > new Date(l.scheduledAt.getTime() + 60*60*1000)
      ).length;

      const nextAppointment = await prisma.appointment.findFirst({
        where: { patientId: userId, scheduledDate: { gte: startOfDay }, status: { in: ['PENDING', 'CONFIRMED'] } },
        orderBy: { scheduledDate: 'asc' }
      });

      const vitals = await prisma.vital.findMany({
        where: { userId, recordedAt: { gte: startOfDay, lte: endOfDay } }
      });

      result = { adherenceRate, delayedDoses, vitalsCount: vitals.length, nextAppointment };

    } else if (role === Role.DOCTOR) {
      const appointments = await prisma.appointment.findMany({
        where: { doctorId: userId, scheduledDate: startOfDay }
      });
      
      const uniquePatients = new Set(appointments.map(a => a.patientId)).size;
      const totalAppointments = appointments.length;
      
      const profile = await prisma.doctorProfile.findUnique({ where: { userId } });
      const avgDuration = profile?.avgConsultationMinutes || 15;

      const queueTokens = await prisma.queueToken.findMany({
        where: { doctorId: userId, appointment: { scheduledDate: startOfDay } }
      });
      
      const completedQueue = queueTokens.filter(q => q.status === 'COMPLETED').length;
      const queueCompletionRate = queueTokens.length > 0 ? (completedQueue / queueTokens.length) * 100 : 0;

      result = { uniquePatients, totalAppointments, avgDuration, queueCompletionRate };
    } else {
      result = {};
    }

    await CacheUtils.set(cacheKey, result, 24 * 60 * 60);
    return result;
  },

  async getAdherenceReport(userId: string, rangeDays: number) {
    const cacheKey = `adherence:${userId}:${rangeDays}`;
    const cached = await CacheUtils.get(cacheKey);
    if (cached) return cached;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rangeDays);
    startDate.setHours(0,0,0,0);

    const logs = await prisma.medicationLog.findMany({
      where: {
        userId,
        scheduledAt: { gte: startDate }
      },
      orderBy: { scheduledAt: 'asc' }
    });

    const days: Record<string, { total: number, taken: number }> = {};
    for (const log of logs) {
      const dayStr = log.scheduledAt.toISOString().split('T')[0];
      if (!days[dayStr]) days[dayStr] = { total: 0, taken: 0 };
      days[dayStr].total++;
      if (log.status === 'TAKEN') days[dayStr].taken++;
    }

    let streaks = 0;
    let maxStreak = 0;
    let totalTaken = 0;
    let totalScheduled = 0;

    // Use sorted keys to accurately calculate streaks
    const sortedDays = Object.keys(days).sort();
    for (const dayStr of sortedDays) {
      const day = days[dayStr];
      totalScheduled += day.total;
      totalTaken += day.taken;
      if (day.total > 0 && day.taken === day.total) {
        streaks++;
        if (streaks > maxStreak) maxStreak = streaks;
      } else {
        streaks = 0;
      }
    }

    const ratio = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 100;

    const result = { maxStreak, currentStreak: streaks, ratio, rangeDays };

    await CacheUtils.set(cacheKey, result, 6 * 60 * 60);
    return result;
  },

  async getExportData(userId: string, type: 'vitals' | 'medications' | 'all', startDate: Date, endDate: Date) {
    let vitals: any[] = [];
    let medications: any[] = [];

    if (type === 'vitals' || type === 'all') {
      vitals = await prisma.vital.findMany({
        where: {
          userId,
          recordedAt: { gte: startDate, lte: endDate }
        },
        orderBy: { recordedAt: 'asc' }
      });
    }

    if (type === 'medications' || type === 'all') {
      medications = await prisma.medicationLog.findMany({
        where: {
          userId,
          scheduledAt: { gte: startDate, lte: endDate }
        },
        include: { medicine: true },
        orderBy: { scheduledAt: 'asc' }
      });
    }

    return {
      vitals: vitals.map(v => {
        let measurement = '';
        if (v.vitalType === 'BLOOD_PRESSURE') {
          measurement = `${v.values.systolic}/${v.values.diastolic} mmHg`;
        } else if (v.vitalType === 'GLUCOSE') {
          measurement = `${v.values.value} mg/dL ${v.values.isFasting ? '(Fasting)' : ''}`;
        } else if (v.vitalType === 'WEIGHT') {
          measurement = `${v.values.value} ${v.values.unit || 'kg'}`;
        } else if (v.vitalType === 'TEMPERATURE') {
          measurement = `${v.values.value} °F`;
        } else if (v.vitalType === 'PULSE') {
          measurement = `${v.values.value} bpm`;
        } else if (v.vitalType === 'OXYGEN_SATURATION') {
          measurement = `${v.values.value} %`;
        } else {
          measurement = JSON.stringify(v.values);
        }
        
        return {
          id: v.id,
          type: v.vitalType,
          measurement,
          recordedAt: v.recordedAt,
          notes: v.notes
        };
      }),
      medications: medications.map(m => ({
        id: m.id,
        medicineName: m.medicine?.name,
        dosage: `${m.medicine?.dosage} ${m.medicine?.unit}`,
        scheduledAt: m.scheduledAt,
        takenAt: m.takenAt,
        status: m.status
      }))
    };
  }
};
