import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { getIO } from '../lib/socket.js';
import { NotificationType } from '@prisma/client';

export const reminderProcessor = async (job: Job) => {
  const { logId, userId, medicineName, scheduledAt } = job.data;

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.MEDICATION_REMINDER,
      title: 'Time for your medication',
      message: `It is almost time to take your medication: ${medicineName} at ${new Date(scheduledAt).toLocaleTimeString()}`,
      metadata: { logId, medicineName, scheduledAt },
    },
  });

  try {
    const io = getIO();
    io.of('/notifications').to(`user:${userId}`).emit('notification:new', notification);
  } catch (_e) {
    // socket.io not initialized during isolated testing
  }

  logger.info(`Processed reminder for logId ${logId}`);
};

export const reminderWorker = new Worker(
  'medication-reminders',
  reminderProcessor,
  { connection: redisConnection as any }
);

reminderWorker.on('failed', (job, err) => {
  logger.error(`Reminder job ${job?.id} failed: ${err.message}`);
});
