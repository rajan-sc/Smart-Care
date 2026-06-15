import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { getIO } from '../lib/socket.js';
import { NotificationService } from './notification.service.js';

export const QueueService = {
  async getLiveQueue(doctorId: string, db: any = prisma) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const activeToken = await db.queueToken.findFirst({
      where: {
        doctorId,
        status: 'IN_PROGRESS',
        appointment: { scheduledDate: today },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    const waitingTokens = await db.queueToken.findMany({
      where: {
        doctorId,
        status: 'WAITING',
        appointment: { scheduledDate: today },
      },
      orderBy: { tokenNumber: 'asc' },
    });

    const doctorProfile = await db.doctorProfile.findUnique({
      where: { userId: doctorId },
      select: { avgConsultationMinutes: true },
    });

    const avgMinutes = doctorProfile?.avgConsultationMinutes || 15;
    const tokensAhead = activeToken ? waitingTokens.length + 1 : waitingTokens.length;

    return {
      activeToken: activeToken ? activeToken.tokenNumber : null,
      totalWaiting: waitingTokens.length,
      estimatedWaitMinutes: tokensAhead * avgMinutes,
      avgMinutes,
    };
  },

  async getMyQueue(doctorId: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return await prisma.queueToken.findMany({
      where: {
        doctorId,
        appointment: { scheduledDate: today },
      },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        appointment: true,
      },
      orderBy: { tokenNumber: 'asc' },
    });
  },

  async advanceQueue(doctorId: string, action: 'CALL_NEXT' | 'COMPLETE_CURRENT' | 'SKIP_CURRENT') {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return await prisma.$transaction(async (tx) => {
      const currentToken = await tx.queueToken.findFirst({
        where: {
          doctorId,
          status: 'IN_PROGRESS',
          appointment: { scheduledDate: today },
        },
      });

      if (action === 'COMPLETE_CURRENT' || action === 'SKIP_CURRENT') {
        if (!currentToken) {
          throw AppError.badRequest('No patient is currently in progress');
        }

        await tx.queueToken.update({
          where: { id: currentToken.id },
          data: {
            status: action === 'COMPLETE_CURRENT' ? 'COMPLETED' : 'SKIPPED',
            completedAt: new Date(),
          },
        });

        await tx.appointment.update({
          where: { id: currentToken.appointmentId },
          data: {
            status: action === 'COMPLETE_CURRENT' ? 'COMPLETED' : 'NO_SHOW',
          },
        });
      }

      if (action === 'CALL_NEXT') {
        if (currentToken) {
          throw AppError.badRequest('Please complete or skip the current patient first');
        }

        const nextToken = await tx.queueToken.findFirst({
          where: {
            doctorId,
            status: 'WAITING',
            appointment: { scheduledDate: today },
          },
          orderBy: { tokenNumber: 'asc' },
        });

        if (!nextToken) {
          throw AppError.notFound('No more patients in the queue');
        }

        await tx.queueToken.update({
          where: { id: nextToken.id },
          data: {
            status: 'IN_PROGRESS',
            calledAt: new Date(),
          },
        });

        await tx.appointment.update({
          where: { id: nextToken.appointmentId },
          data: { status: 'IN_PROGRESS' },
        });

        // Notify patient
        await NotificationService.createAndEmit({
          userId: nextToken.patientId,
          type: 'APPOINTMENT_REMINDER',
          title: 'You are Next!',
          message: `The doctor is ready to see you now for token #${nextToken.tokenNumber}.`,
          metadata: { appointmentId: nextToken.appointmentId, tokenNumber: nextToken.tokenNumber },
        });
      }

      const liveQueue = await this.getLiveQueue(doctorId, tx);

      try {
        const io = getIO();
        io.of('/queue').to(`queue:${doctorId}`).emit('queue:update', liveQueue);
      } catch (_e) {
        // Socket.io not initialized or other error (mostly during unit testing)
      }

      return liveQueue;
    });
  },
};
