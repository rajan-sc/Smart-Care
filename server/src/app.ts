import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.routes.js';
import authRouter from './routes/auth.routes.js';
import userRouter from './routes/user.routes.js';
import doctorRouter from './routes/doctor.routes.js';
import appointmentRouter from './routes/appointment.routes.js';
import queueRouter from './routes/queue.routes.js';
import vitalRouter from './routes/vital.routes.js';
import notificationRouter from './routes/notification.routes.js';
import caregiverRouter from './routes/caregiver.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import medicineRouter from './routes/medicine.routes.js';
import adminRouter from './routes/admin.routes.js';
import medicalRecordRouter from './routes/medicalRecord.routes.js';
import paymentRouter from './routes/payment.routes.js';
import logger from './utils/logger.js';

export const createApp = () => {
  const app = express();

  // Security and Utilities
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Observability: Log requests
  app.use((req, _res, next) => {
    logger.info(
      { method: req.method, url: req.originalUrl },
      `Incoming request: ${req.method} ${req.originalUrl}`,
    );
    next();
  });

  // Mount Routers
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/doctors', doctorRouter);
  app.use('/api/v1/appointments', appointmentRouter);
  app.use('/api/v1/queue', queueRouter);
  app.use('/api/v1/vitals', vitalRouter);
  app.use('/api/v1/notifications', notificationRouter);
  app.use('/api/v1/caregivers', caregiverRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/medicines', medicineRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/records', medicalRecordRouter);
  app.use('/api/v1/payments', paymentRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
