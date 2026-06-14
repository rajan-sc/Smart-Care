import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service.js';

export const AppointmentController = {
  async bookAppointment(req: Request, res: Response) {
    const appointment = await AppointmentService.bookAppointment(req.user!.id, req.body);
    res.json({ success: true, data: appointment });
  },

  async getMy(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    let result;
    if (req.user!.role === 'DOCTOR') {
      result = await AppointmentService.getMyAsDoctor(req.user!.id, page, limit);
    } else {
      result = await AppointmentService.getMyAsPatient(req.user!.id, page, limit);
    }

    res.json({ success: true, data: result.data, meta: result.meta });
  },

  async cancelAppointment(req: Request, res: Response) {
    await AppointmentService.cancelAppointment(req.params.id as string, req.user!.id, req.user!.role);
    res.json({ success: true, data: { message: 'Appointment cancelled successfully' } });
  },

  async updateNotesAndPrescription(req: Request, res: Response) {
    const appointment = await AppointmentService.updateNotesAndPrescription(
      req.params.id as string,
      req.user!.id,
      req.body.clinicalNotes,
      req.body.medicines
    );
    res.json({ success: true, data: appointment });
  },
};
