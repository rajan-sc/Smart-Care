import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let dbStatus = 'UP';
    let redisStatus = 'UP';
    const checks: Record<string, any> = {};

    // 1. Check DB
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch (_error: any) {
      dbStatus = 'DOWN';
      checks.database = 'error';
    }

    // 2. Check Redis
    try {
      if (redis.status === 'wait') {
        await redis.connect();
      }
      const pingRes = await redis.ping();
      if (pingRes === 'PONG') {
        checks.redis = 'connected';
      } else {
        redisStatus = 'DOWN';
        checks.redis = `unexpected response: ${pingRes}`;
      }
    } catch (_error: any) {
      redisStatus = 'DOWN';
      checks.redis = 'error';
    }

    const overallStatus = dbStatus === 'UP' && redisStatus === 'UP' ? 200 : 503;

    return res.status(overallStatus).json({
      success: overallStatus === 200,
      data: {
        status: overallStatus === 200 ? 'healthy' : 'unhealthy',
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        details: checks,
      },
    });
  }),
);

export default router;
