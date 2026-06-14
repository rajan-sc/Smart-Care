import { Router } from 'express';
import { QueueController } from '../controllers/queue.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { advanceQueueSchema } from '../validators/queue.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Doctor-only endpoint to get all of today's queue tokens
router.get(
  '/',
  authorize([Role.DOCTOR]),
  asyncHandler(QueueController.getMyQueue),
);

// Public (authenticated) endpoint for patients to check queue
router.get(
  '/live/:doctorId',
  asyncHandler(QueueController.getLiveQueue),
);

// Doctor-only endpoint to advance the queue
router.post(
  '/next',
  authorize([Role.DOCTOR]),
  validate(advanceQueueSchema),
  asyncHandler(QueueController.advanceQueue),
);

export default router;
