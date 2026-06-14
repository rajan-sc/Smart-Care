import prisma from '../lib/prisma.js';
import { AppError } from '../utils/apiError.js';
import { getIO } from '../lib/socket.js';
import { NotificationType, Prisma } from '@prisma/client';

export const NotificationService = {
  async createAndEmit(data: Prisma.NotificationUncheckedCreateInput) {
    const notification = await prisma.notification.create({ data });
    try {
      const io = getIO();
      io.of('/notifications').to(`user:${data.userId}`).emit('notification:new', notification);
    } catch (_e) {
      // Ignore if socket isn't ready
    }
    return notification;
  },
  async getNotifications(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return { data, meta: { total, page, limit } };
  },

  async markAsRead(userId: string, notificationId: string) {
    const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notif || notif.userId !== userId) {
      throw AppError.notFound('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  },
};
