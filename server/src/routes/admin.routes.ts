import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { queryUsersSchema, updateRoleSchema, queryAuditLogsSchema } from '../validators/admin.validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate, authorize([Role.ADMIN]));

router.get(
  '/analytics',
  asyncHandler(AdminController.getSystemAnalytics)
);

router.get(
  '/users',
  validate(queryUsersSchema),
  asyncHandler(AdminController.getUsers)
);

router.patch(
  '/users/:id/role',
  validate(updateRoleSchema),
  asyncHandler(AdminController.updateUserRole)
);

router.get(
  '/audit-logs',
  validate(queryAuditLogsSchema),
  asyncHandler(AdminController.getAuditLogs)
);

export default router;
