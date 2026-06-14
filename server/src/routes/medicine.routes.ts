import { Router } from 'express';
import { MedicineController } from '../controllers/medicine.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createMedicineSchema, skipLogSchema, snoozeLogSchema } from '../validators/medicine.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Patients manage their medicines
  router.post(
    '/',
    authorize([Role.PATIENT]),
    validate(createMedicineSchema),
    asyncHandler(MedicineController.createSchedule)
  );
  
  router.put(
    '/:id',
    authorize([Role.PATIENT]),
    validate(createMedicineSchema),
    asyncHandler(MedicineController.updateMedicine)
  );
  
  router.delete(
    '/:id',
    authorize([Role.PATIENT]),
    asyncHandler(MedicineController.deleteMedicine)
  );

router.get(
  '/',
  authorize([Role.PATIENT]),
  asyncHandler(MedicineController.getMedicines)
);

router.get(
  '/today',
  authorize([Role.PATIENT]),
  asyncHandler(MedicineController.getTodayLogs)
);

router.patch(
  '/logs/:id/taken',
  authorize([Role.PATIENT]),
  asyncHandler(MedicineController.markTaken)
);

router.patch(
  '/logs/:id/skipped',
  authorize([Role.PATIENT]),
  validate(skipLogSchema),
  asyncHandler(MedicineController.markSkipped)
);

router.patch(
  '/logs/:id/snooze',
  authorize([Role.PATIENT]),
  validate(snoozeLogSchema),
  asyncHandler(MedicineController.snoozeLog)
);

export default router;
