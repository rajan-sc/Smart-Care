import { Request, Response } from 'express';
import { QueueService } from '../services/queue.service.js';

export const QueueController = {
  async getLiveQueue(req: Request, res: Response) {
    const queueState = await QueueService.getLiveQueue(req.params.doctorId as string);
    res.json({ success: true, data: queueState });
  },

  async getMyQueue(req: Request, res: Response) {
    const queue = await QueueService.getMyQueue(req.user!.id);
    res.json({ success: true, data: queue });
  },

  async advanceQueue(req: Request, res: Response) {
    const queueState = await QueueService.advanceQueue(req.user!.id, req.body.action);
    res.json({ success: true, data: queueState });
  },
};
