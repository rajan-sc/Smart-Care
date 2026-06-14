import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { AnalyticsService } from '../services/analytics.service.js';

export const analyticsPrecomputeProcessor = async (_job: Job) => {
  logger.info('Starting nightly analytics precomputation');
  const todayStr = new Date().toISOString().split('T')[0];

  const patients = await prisma.user.findMany({ where: { role: 'PATIENT', isActive: true }});
  
  for (const p of patients) {
    try {
      const dashboard = await AnalyticsService.getDashboard(p.id, 'PATIENT', todayStr) as any;
      const adherence = await AnalyticsService.getAdherenceReport(p.id, 30) as any;
      
      const targetDate = new Date(todayStr);
      
      await prisma.analyticsSnapshot.upsert({
        where: {
          uq_user_date: {
            userId: p.id,
            date: targetDate,
          }
        },
        update: {
          adherenceRate: dashboard.adherenceRate || 0,
          maxStreak: adherence.maxStreak || 0,
          currentStreak: adherence.currentStreak || 0,
          delayedDoses: dashboard.delayedDoses || 0,
          vitalsCount: dashboard.vitalsCount || 0,
        },
        create: {
          userId: p.id,
          date: targetDate,
          adherenceRate: dashboard.adherenceRate || 0,
          maxStreak: adherence.maxStreak || 0,
          currentStreak: adherence.currentStreak || 0,
          delayedDoses: dashboard.delayedDoses || 0,
          vitalsCount: dashboard.vitalsCount || 0,
        }
      });
      
    } catch (e: any) {
      logger.error(`Failed to precompute analytics for patient ${p.id}: ${e.message}`);
    }
  }
  
  logger.info(`Precomputed analytics for ${patients.length} patients.`);
};

export const analyticsPrecomputeWorker = new Worker(
  'analytics-precompute',
  analyticsPrecomputeProcessor,
  { connection: redisConnection as any }
);

analyticsPrecomputeWorker.on('failed', (job, err) => {
  logger.error(`Analytics precompute job ${job?.id} failed: ${err.message}`);
});
