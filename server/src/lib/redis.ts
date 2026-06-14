import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true, // Allow manual connection triggers if needed
});

redis.on('connect', () => {
  logger.info('Connected to Redis successfully');
});

redis.on('error', (err: Error) => {
  logger.error(err, 'Redis connection error:');
});

export default redis;
