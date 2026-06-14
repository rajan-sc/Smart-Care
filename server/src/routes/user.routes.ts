import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/user.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Role } from '@prisma/client';

const router = Router();

// Update my profile
router.put(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(UserController.updateProfile),
);

// Admin soft-delete users
router.delete(
  '/:id',
  authenticate,
  authorize([Role.ADMIN]),
  asyncHandler(UserController.deleteUser),
);

export default router;
