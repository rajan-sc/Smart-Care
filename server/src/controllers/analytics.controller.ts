import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics.service.js';

export const AnalyticsController = {
  async getDashboard(req: Request, res: Response) {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const dashboard = await AnalyticsService.getDashboard(req.user!.id, req.user!.role, dateStr);
    res.json({ success: true, data: dashboard });
  },

  async getAdherence(req: Request, res: Response) {
    const range = parseInt(req.query.range as string) || 7;
    const report = await AnalyticsService.getAdherenceReport(req.user!.id, range);
    res.json({ success: true, data: report });
  },

  async exportData(req: Request, res: Response) {
    const { type = 'all', startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: { message: 'startDate and endDate are required' } });
    }
    
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    
    // Safety boundaries: make end the end of the day
    end.setHours(23, 59, 59, 999);

    const exportData = await AnalyticsService.getExportData(req.user!.id, type as any, start, end);
    res.json({ success: true, data: exportData });
  }
};
