import { Router } from 'express';
import { DoctorController } from '../controllers/doctor.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateDoctorProfileSchema, updateAvailabilitySchema } from '../validators/doctor.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Role } from '@prisma/client';

const router = Router();

// Public doctor search and view
router.get(
  '/',
  asyncHandler(DoctorController.searchDoctors),
);

router.get(
  '/:id',
  asyncHandler(DoctorController.getDoctor),
);

// Doctor only self-management routes
router.put(
  '/me/profile',
  authenticate,
  authorize([Role.DOCTOR]),
  validate(updateDoctorProfileSchema),
  asyncHandler(DoctorController.updateProfile),
);

router.put(
  '/me/availability',
  authenticate,
  authorize([Role.DOCTOR]),
  validate(updateAvailabilitySchema),
  asyncHandler(DoctorController.updateAvailability),
);

// Doctor patient access routes
router.get(
  '/me/patients',
  authenticate,
  authorize([Role.DOCTOR]),
  asyncHandler(DoctorController.getMyPatients),
);

router.get(
  '/me/patients/:patientId/vitals',
  authenticate,
  authorize([Role.DOCTOR]),
  asyncHandler(DoctorController.getPatientVitals),
);

router.get(
  '/me/patients/:patientId/medications',
  authenticate,
  authorize([Role.DOCTOR]),
  asyncHandler(DoctorController.getPatientMedications),
);

router.get(
  '/me/patients/:patientId/records',
  authenticate,
  authorize([Role.DOCTOR]),
  asyncHandler(DoctorController.getPatientRecords),
);

export default router;
