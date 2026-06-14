import { Request, Response } from 'express';
import { MedicineService } from '../services/medicine.service.js';

export const MedicineController = {
  async createSchedule(req: Request, res: Response) {
    const medicine = await MedicineService.createSchedule(req.user!.id, req.body);
    res.status(201).json({ success: true, data: medicine });
  },

  async updateMedicine(req: Request, res: Response) {
    const medicine = await MedicineService.updateMedicine(req.params.id as string, req.user!.id, req.body);
    res.json({ success: true, data: medicine });
  },

  async deleteMedicine(req: Request, res: Response) {
    await MedicineService.deleteMedicine(req.params.id as string, req.user!.id);
    res.json({ success: true });
  },

  async getMedicines(req: Request, res: Response) {
    const medicines = await MedicineService.getMedicines(req.user!.id);
    res.json({ success: true, data: medicines });
  },

  async getTodayLogs(req: Request, res: Response) {
    const logs = await MedicineService.getTodayLogs(req.user!.id);
    res.json({ success: true, data: logs });
  },

  async markTaken(req: Request, res: Response) {
    const log = await MedicineService.markTaken(req.params.id as string, req.user!.id);
    res.json({ success: true, data: log });
  },

  async markSkipped(req: Request, res: Response) {
    const log = await MedicineService.markSkipped(req.params.id as string, req.user!.id, req.body.reason);
    res.json({ success: true, data: log });
  },

  async snoozeLog(req: Request, res: Response) {
    const log = await MedicineService.snoozeLog(req.params.id as string, req.user!.id, req.body.snoozeMinutes);
    res.json({ success: true, data: log });
  }
};
