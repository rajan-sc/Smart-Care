import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import prisma from '../lib/prisma.js';
import logger from '../utils/logger.js';
import { getIO } from '../lib/socket.js';
import { NotificationType } from '@prisma/client';

export const caregiverEscalationProcessor = async (job: Job) => {
  const { vitalId, patientId, vitalType, message } = job.data;

  const links = await prisma.caregiverLink.findMany({
    where: {
      patientId,
      status: 'ACCEPTED',
      permissions: { has: 'RECEIVE_ALERTS' },
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  for (const link of links) {
    const notification = await prisma.notification.create({
      data: {
        userId: link.caregiverId,
        type: NotificationType.CAREGIVER_ALERT,
        title: 'Patient Vital Alert',
        message: `Alert for ${link.patient.firstName} ${link.patient.lastName}: ${message}`,
        metadata: { vitalId, patientId, vitalType },
      },
    });

    try {
      const io = getIO();
      io.of('/notifications').to(`user:${link.caregiverId}`).emit('notification:new', notification);
    } catch (_e) {
      // Ignored for testing
    }
  }

  logger.info(`Processed escalation for vitalId ${vitalId}, sent to ${links.length} caregivers.`);
};

export const caregiverEscalationWorker = new Worker(
  'caregiver-escalation',
  caregiverEscalationProcessor,
  { connection: redisConnection as any }
);

caregiverEscalationWorker.on('failed', (job, err) => {
  logger.error(`Escalation job ${job?.id} failed: ${err.message}`);
});
