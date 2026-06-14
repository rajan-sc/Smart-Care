import { Server } from 'http';
import { createServer } from 'http';
import { Express } from 'express';
import logger from './utils/logger.js';
import { env } from './config/env.js';
import { initializeSocket } from './lib/socket.js';
import { startCronJobs } from './jobs/cron.js';
import './jobs/logGeneration.worker.js';
import './jobs/reminder.worker.js';
import './jobs/caregiverEscalation.worker.js';
import './jobs/analyticsPrecompute.worker.js';
import './jobs/notificationCleanup.worker.js';

export const startServer = (app: Express): Server => {
  const port = env.PORT;

  const server = createServer(app);
  initializeSocket(server);
  
  startCronJobs();

  server.listen(port, () => {
    logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${port}`);
  });

  return server;
};
