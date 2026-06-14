import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticate);

router.get(
  '/dashboard',
  asyncHandler(AnalyticsController.getDashboard)
);

router.get(
  '/adherence',
  asyncHandler(AnalyticsController.getAdherence)
);

router.get(
  '/export',
  asyncHandler(AnalyticsController.exportData)
);

export default router;
