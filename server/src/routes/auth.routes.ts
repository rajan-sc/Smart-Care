import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/authenticate.js';
import { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from '../validators/auth.validator.js';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased limit for development
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests from this IP, please try again after 15 minutes',
    }
  },
});

const router = Router();

router.use('/auth', authLimiter);

router.post('/auth/register', validate(registerSchema), AuthController.register);
router.post('/auth/login', validate(loginSchema), AuthController.login);
router.post('/auth/refresh', AuthController.refresh);

router.post('/auth/logout', authenticate, AuthController.logout);
router.get('/auth/me', authenticate, AuthController.getMe);
router.patch(
  '/auth/change-password',
  authenticate,
  validate(changePasswordSchema),
  AuthController.changePassword,
);

router.post('/auth/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/auth/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/auth/request-verification', authenticate, AuthController.requestVerificationEmail);
router.post('/auth/verify-email', validate(verifyEmailSchema), AuthController.verifyEmail);

export default router;
