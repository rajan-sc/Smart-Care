import { Redis } from 'ioredis';
import { env } from './env.js';
import logger from '../utils/logger.js';

export const redisConnection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisConnection.on('error', (err) => {
  logger.error(err, 'Redis connection error');
});

redisConnection.on('connect', () => {
  logger.info('🟢 Connected to Redis successfully');
});
