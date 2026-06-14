import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';

export const notificationCleanupProcessor = async (job: Job) => {
  logger.info(`Starting notification cleanup job ${job.id}`);
  
  // Calculate date 30 days ago
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Delete read notifications older than 30 days
  const { count } = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: {
        lt: thirtyDaysAgo
      }
    }
  });

  logger.info(`Successfully deleted ${count} old read notifications.`);
};

export const notificationCleanupWorker = new Worker(
  'notification-cleanup',
  notificationCleanupProcessor,
  { connection: redisConnection as any }
);

notificationCleanupWorker.on('failed', (job, err) => {
  logger.error(`Notification cleanup job ${job?.id} failed: ${err.message}`);
});
