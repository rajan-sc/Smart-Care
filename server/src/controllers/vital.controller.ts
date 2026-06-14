import { Request, Response } from 'express';
import { VitalService } from '../services/vital.service.js';
import { VitalType } from '@prisma/client';

export const VitalController = {
  async recordVital(req: Request, res: Response) {
    const vital = await VitalService.recordVital(req.user!.id, req.body);
    res.status(201).json({ success: true, data: vital });
  },

  async getHistory(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as VitalType | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await VitalService.getVitals(req.user!.id, type, startDate, endDate, page, limit);
    res.json({ success: true, data: result.data, meta: result.meta });
  },

  async getLatest(req: Request, res: Response) {
    const latest = await VitalService.getLatestVitals(req.user!.id);
    res.json({ success: true, data: latest });
  },

  async getTrends(req: Request, res: Response) {
    const type = req.query.type as VitalType;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const trends = await VitalService.getVitalTrends(req.user!.id, type, startDate, endDate);
    res.json({ success: true, data: trends });
  }
};
