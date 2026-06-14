import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service.js';

export const NotificationController = {
  async getMy(req: Request, res: Response) {
    const page = req.query.page as unknown as number;
    const limit = req.query.limit as unknown as number;
    
    const result = await NotificationService.getNotifications(req.user!.id, page, limit);
    res.json({ success: true, ...result });
  },

  async markAsRead(req: Request, res: Response) {
    await NotificationService.markAsRead(req.user!.id, req.params.id as string);
    res.json({ success: true, data: { message: 'Marked as read' } });
  },

  async markAllAsRead(req: Request, res: Response) {
    await NotificationService.markAllAsRead(req.user!.id);
    res.json({ success: true, data: { message: 'All marked as read' } });
  },

  async getUnreadCount(req: Request, res: Response) {
    const result = await NotificationService.getUnreadCount(req.user!.id);
    res.json({ success: true, data: result });
  },
};
