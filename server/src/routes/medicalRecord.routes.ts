import { Router } from 'express';
import multer from 'multer';
import { MedicalRecordController } from '../controllers/medicalRecord.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { Role } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Require Patient auth for all routes
router.use(authenticate, authorize([Role.PATIENT]));

router.post(
  '/',
  upload.single('file'),
  asyncHandler(MedicalRecordController.uploadRecord)
);

router.get(
  '/',
  asyncHandler(MedicalRecordController.getMyRecords)
);

router.delete(
  '/:id',
  asyncHandler(MedicalRecordController.deleteRecord)
);

export default router;
