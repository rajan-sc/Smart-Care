import { Router } from 'express';
import { CaregiverController } from '../controllers/caregiver.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { linkCaregiverSchema, updateCaregiverLinkSchema } from '../validators/caregiver.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Patients invite caregivers
router.post(
  '/link',
  authorize([Role.PATIENT]),
  validate(linkCaregiverSchema),
  asyncHandler(CaregiverController.linkCaregiver)
);

// Both can update
router.patch(
  '/links/:id',
  validate(updateCaregiverLinkSchema),
  asyncHandler(CaregiverController.updateLink)
);

// Patient revokes access
router.delete(
  '/links/:id',
  authorize([Role.PATIENT]),
  asyncHandler(CaregiverController.revokeLink)
);

// Patient reads their caregivers
router.get(
  '/my-caregivers',
  authorize([Role.PATIENT]),
  asyncHandler(CaregiverController.getMyCaregivers)
);

// Caregiver reads
router.get(
  '/patients',
  authorize([Role.CAREGIVER]),
  asyncHandler(CaregiverController.getLinkedPatients)
);

router.get(
  '/patients/:patientId/vitals',
  authorize([Role.CAREGIVER]),
  asyncHandler(CaregiverController.getPatientVitals)
);

router.get(
  '/patients/:patientId/medications',
  authorize([Role.CAREGIVER]),
  asyncHandler(CaregiverController.getPatientMedications)
);

router.get(
  '/patients/:patientId/appointments',
  authorize([Role.CAREGIVER]),
  asyncHandler(CaregiverController.getPatientAppointments)
);

router.get(
  '/patients/:patientId/records',
  authorize([Role.CAREGIVER]),
  asyncHandler(CaregiverController.getPatientRecords)
);

export default router;
