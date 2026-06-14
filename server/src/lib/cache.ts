import { redisConnection } from '../config/redis.js';

export const CacheUtils = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redisConnection.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (_e) {
      return null;
    }
  },

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    await redisConnection.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async invalidate(pattern: string): Promise<void> {
    if (!pattern.includes('*')) {
      await redisConnection.del(pattern);
      return;
    }
    let cursor = '0';
    do {
      const [newCursor, keys] = await redisConnection.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      if (keys.length > 0) {
        await redisConnection.del(...keys);
      }
    } while (cursor !== '0');
  }
};
