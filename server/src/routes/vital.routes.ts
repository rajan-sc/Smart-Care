import { Router } from 'express';
import { VitalController } from '../controllers/vital.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { recordVitalSchema } from '../validators/vital.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validate(recordVitalSchema),
  asyncHandler(VitalController.recordVital),
);

router.get(
  '/history',
  asyncHandler(VitalController.getHistory),
);

router.get(
  '/latest',
  asyncHandler(VitalController.getLatest),
);

router.get(
  '/trends',
  asyncHandler(VitalController.getTrends),
);

export default router;
