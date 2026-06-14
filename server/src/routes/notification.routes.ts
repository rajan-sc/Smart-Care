import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { asyncHandler } from '../utils/asyncHandler.js';

import { validate } from '../middleware/validate.js';
import { getNotificationsSchema } from '../validators/notification.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(getNotificationsSchema), asyncHandler(NotificationController.getMy));
router.get('/unread-count', asyncHandler(NotificationController.getUnreadCount));
router.patch('/read-all', asyncHandler(NotificationController.markAllAsRead));
router.patch('/:id/read', asyncHandler(NotificationController.markAsRead));

export default router;
