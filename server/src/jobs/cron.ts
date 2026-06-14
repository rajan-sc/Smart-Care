import cron from 'node-cron';
import prisma from '../lib/prisma.js';
import { logGenerationQueue, medicationRemindersQueue, analyticsPrecomputeQueue, notificationCleanupQueue } from '../config/bullmq.js';
import logger from '../utils/logger.js';

export const startCronJobs = () => {
  // 1. Daily log generation at 00:00
  cron.schedule('0 0 * * *', async () => {
    logger.info('Triggering daily log generation job');
    await logGenerationQueue.add('daily-generation', {});
  });

  // 1.5 Analytics precompute at 02:00
  cron.schedule('0 2 * * *', async () => {
    logger.info('Triggering daily analytics precompute');
    await analyticsPrecomputeQueue.add('daily-analytics', {});
  });

  // 1.8 Database cleanup at 03:00
  cron.schedule('0 3 * * *', async () => {
    logger.info('Triggering nightly database cleanup');
    await notificationCleanupQueue.add('daily-cleanup', {});
  });

  // 2. Reminder dispatcher every 60 seconds
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      // look exactly 5 mins ahead
      const targetTimeStart = new Date(now.getTime() + 5 * 60000);
      targetTimeStart.setSeconds(0, 0);
      const targetTimeEnd = new Date(targetTimeStart.getTime() + 59999);

      const logs = await prisma.medicationLog.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: {
            gte: targetTimeStart,
            lte: targetTimeEnd,
          },
        },
        include: { medicine: true },
      });

      for (const log of logs) {
        const jitter = Math.floor(Math.random() * 30000); // 0 to 30 seconds delay
        
        await medicationRemindersQueue.add(
          'send-reminder',
          { logId: log.id, userId: log.userId, medicineName: log.medicine.name, scheduledAt: log.scheduledAt },
          { delay: jitter }
        );
      }

      if (logs.length > 0) {
        logger.info(`Enqueued ${logs.length} medication reminders.`);
      }
    } catch (err) {
      logger.error(err, 'Error in Reminder Dispatcher cron');
    }
  });
};
