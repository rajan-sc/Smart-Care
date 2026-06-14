import { z } from 'zod';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid database URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis URL'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173').transform((str) => str.split(',').map((s) => s.trim())),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  CASHFREE_CLIENT_ID: z.string().optional(),
  CASHFREE_CLIENT_SECRET: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_BUCKET_NAME: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Invalid or missing environment variables:');
      error.issues.forEach((err) => {
        logger.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    logger.error(error, '❌ Unknown error parsing environment variables:');
    process.exit(1);
  }
};

export const env = parseEnv();
