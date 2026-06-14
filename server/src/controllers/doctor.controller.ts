import { Request, Response } from 'express';
import { DoctorService } from '../services/doctor.service.js';

export const DoctorController = {
  async updateProfile(req: Request, res: Response) {
    const profile = await DoctorService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, data: profile });
  },

  async updateAvailability(req: Request, res: Response) {
    const availability = await DoctorService.updateAvailability(req.user!.id, req.body.availability);
    res.json({ success: true, data: availability });
  },

  async getDoctor(req: Request, res: Response) {
    const doctor = await DoctorService.getDoctorProfile(req.params.id as string);
    res.json({ success: true, data: doctor });
  },

  async searchDoctors(req: Request, res: Response) {
    const search = req.query.search as string | undefined;
    const specialization = req.query.specialization as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await DoctorService.searchDoctors(search, specialization, page, limit);
    res.json({ success: true, ...result });
  },

  async getMyPatients(req: Request, res: Response) {
    const patients = await DoctorService.getMyPatients(req.user!.id);
    res.json({ success: true, data: patients });
  },

  async getPatientVitals(req: Request, res: Response) {
    const vitals = await DoctorService.getPatientVitals(req.user!.id, req.params.patientId);
    res.json({ success: true, data: vitals });
  },

  async getPatientMedications(req: Request, res: Response) {
    const meds = await DoctorService.getPatientMedications(req.user!.id, req.params.patientId);
    res.json({ success: true, data: meds });
  },

  async getPatientRecords(req: Request, res: Response) {
    const records = await DoctorService.getPatientRecords(req.user!.id, req.params.patientId);
    res.json({ success: true, data: records });
  },
};
