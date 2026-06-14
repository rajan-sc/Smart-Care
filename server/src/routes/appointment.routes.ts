import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { authorize } from '../middleware/authorize.js';
import { Role } from '@prisma/client';
import { bookAppointmentSchema, updateNotesSchema } from '../validators/appointment.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(bookAppointmentSchema),
  asyncHandler(AppointmentController.bookAppointment),
);

router.get(
  '/me',
  asyncHandler(AppointmentController.getMy),
);

router.post(
  '/:id/cancel',
  asyncHandler(AppointmentController.cancelAppointment),
);

router.put(
  '/:id/notes',
  authorize([Role.DOCTOR]),
  validate(updateNotesSchema),
  asyncHandler(AppointmentController.updateNotesAndPrescription),
);

export default router;
