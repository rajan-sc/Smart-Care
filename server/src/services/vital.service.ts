import prisma from '../lib/prisma.js';
import { VitalType } from '@prisma/client';
import { caregiverEscalationQueue } from '../config/bullmq.js';

export interface RecordVitalInput {
  vitalType: VitalType;
  values: any;
  notes?: string;
  recordedAt?: string;
}

export const VitalService = {
  async recordVital(userId: string, data: RecordVitalInput) {
    const vital = await prisma.vital.create({
      data: {
        userId,
        vitalType: data.vitalType,
        values: data.values,
        notes: data.notes,
        recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
      },
    });

    let isAlert = false;
    let message = '';

    if (data.vitalType === VitalType.BLOOD_PRESSURE) {
      const v = data.values as { systolic: number, diastolic: number };
      if (v.systolic > 140 || v.systolic < 90) {
        isAlert = true;
        message = `Systolic BP out of bounds: ${v.systolic} mmHg`;
      }
    } else if (data.vitalType === VitalType.GLUCOSE) {
      const v = data.values as { value: number };
      if (v.value > 200 || v.value < 70) {
        isAlert = true;
        message = `Glucose out of bounds: ${v.value} mg/dL`;
      }
    }

    if (isAlert) {
      await caregiverEscalationQueue.add('escalate', {
        vitalId: vital.id,
        patientId: userId,
        vitalType: vital.vitalType,
        message,
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    await (await import('../lib/cache.js')).CacheUtils.invalidate(`analytics:${userId}:${todayStr}`);

    return vital;
  },

  async getVitals(userId: string, type?: VitalType, startDate?: string, endDate?: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const where: any = { userId };
    if (type) where.vitalType = type;
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }

    const [vitals, total] = await Promise.all([
      prisma.vital.findMany({
        where,
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.vital.count({ where }),
    ]);

    return { data: vitals, meta: { total, page, limit } };
  },

  async getLatestVitals(userId: string) {
    // PostgreSQL DISTINCT ON is efficient for this
    const latest = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT ON (type) *
      FROM vitals
      WHERE user_id = ${userId}::uuid
      ORDER BY type, recorded_at DESC
    `;
    
    return latest.map(row => ({
      id: row.id,
      userId: row.user_id,
      vitalType: row.type,
      values: row.values,
      notes: row.notes,
      recordedAt: row.recorded_at,
      createdAt: row.created_at
    }));
  },

  async getVitalTrends(userId: string, type: VitalType, startDate: string, endDate: string) {
    const vitals = await prisma.vital.findMany({
      where: {
        userId,
        vitalType: type,
        recordedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      },
      orderBy: { recordedAt: 'asc' }
    });

    const trends = vitals.reduce((acc: any, vital) => {
      const day = vital.recordedAt.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = [];
      acc[day].push(vital.values);
      return acc;
    }, {});

    return trends;
  }
};
