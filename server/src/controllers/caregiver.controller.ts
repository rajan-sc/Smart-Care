import { Request, Response } from 'express';
import { CaregiverService } from '../services/caregiver.service.js';

export const CaregiverController = {
  async linkCaregiver(req: Request, res: Response) {
    const link = await CaregiverService.linkCaregiver(
      req.user!.id,
      req.body.caregiverEmail,
      req.body.relationship,
      req.body.permissions
    );
    res.status(201).json({ success: true, data: link });
  },

  async updateLink(req: Request, res: Response) {
    const link = await CaregiverService.updateLinkStatusOrPermissions(
      req.params.id as string,
      req.user!.id,
      req.user!.role,
      req.body
    );
    return res.json({ success: true, data: link });
  },

  async getMyCaregivers(req: Request, res: Response) {
    const caregivers = await CaregiverService.getPatientCaregivers(req.user!.id);
    return res.json({ success: true, data: caregivers });
  },

  async revokeLink(req: Request, res: Response) {
    await CaregiverService.revokeCaregiverLink(req.params.id as string, req.user!.id);
    return res.json({ success: true, data: { message: 'Link revoked' } });
  },

  async getLinkedPatients(req: Request, res: Response) {
    const patients = await CaregiverService.getLinkedPatients(req.user!.id);
    res.json({ success: true, data: patients });
  },

  async getPatientVitals(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await CaregiverService.getPatientVitals(req.user!.id, req.params.patientId as string, page, limit);
    res.json({ success: true, ...result });
  },

  async getPatientMedications(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await CaregiverService.getPatientMedications(req.user!.id, req.params.patientId as string, page, limit);
    res.json({ success: true, ...result });
  },

  async getPatientAppointments(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await CaregiverService.getPatientAppointments(req.user!.id, req.params.patientId as string, page, limit);
    res.json({ success: true, ...result });
  },

  async getPatientRecords(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await CaregiverService.getPatientRecords(req.user!.id, req.params.patientId as string, page, limit);
    res.json({ success: true, ...result });
  }
};
