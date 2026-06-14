import 'dotenv/config';
import { createApp } from './app.js';
import { startServer } from './server.js';
import logger from './utils/logger.js';
import prisma from './lib/prisma.js';
import redis from './lib/redis.js';

const app = createApp();
const server = startServer(app);

const gracefulShutdown = async (signal: string) => {
  logger.info(`Stopping server, received ${signal}...`);

  server.close(async () => {
    logger.info('HTTP server closed.');

    try {
      await prisma.$disconnect();
      logger.info('Database client disconnected.');
    } catch (err) {
      logger.error(err, 'Error disconnecting database client:');
    }

    try {
      await redis.quit();
      logger.info('Redis connection closed.');
    } catch (err) {
      logger.error(err, 'Error disconnecting Redis:');
    }

    process.exit(0);
  });

  // Force close after 10s if graceful shutdown fails
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error(error, 'Uncaught Exception:');
  // Uncaught exceptions are critical, crash the process
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection:');
  // Log and alert, but don't necessarily crash unless desired
});
