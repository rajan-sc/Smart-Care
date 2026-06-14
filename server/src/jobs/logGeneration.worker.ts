import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';

export const logGenerationWorker = new Worker(
  'log-generation',
  async (job: Job) => {
    logger.info(`Processing log generation job ${job.id}`);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextDayEnd = new Date(tomorrow);
    nextDayEnd.setHours(23, 59, 59, 999);

    const activeMedicines = await prisma.medicine.findMany({
      where: {
        isActive: true,
        startDate: { lte: nextDayEnd },
        OR: [
          { endDate: null },
          { endDate: { gte: tomorrow } },
        ],
      },
    });

    let generatedCount = 0;

    // Idempotent insertion
    for (const med of activeMedicines) {
      for (const time of med.timings) {
        const [hour, minute] = time.split(':').map(Number);
        const scheduledAt = new Date(tomorrow);
        scheduledAt.setHours(hour, minute, 0, 0);

        await prisma.medicationLog.upsert({
          where: {
            uq_medicine_scheduled: {
              medicineId: med.id,
              scheduledAt,
            },
          },
          update: {}, 
          create: {
            medicineId: med.id,
            userId: med.userId,
            scheduledAt,
            status: 'PENDING',
          },
        });
        generatedCount++;
      }
    }

    logger.info(`Log generation completed. Generated/Verified ${generatedCount} logs for ${tomorrow.toISOString().split('T')[0]}.`);
  },
  { connection: redisConnection as any }
);

logGenerationWorker.on('failed', (job, err) => {
  logger.error(`Log generation job ${job?.id} failed: ${err.message}`);
});
