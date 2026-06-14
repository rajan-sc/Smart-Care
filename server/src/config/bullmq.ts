import { Queue, DefaultJobOptions } from 'bullmq';
import { redisConnection } from './redis.js';

const defaultJobOptions: DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

export const medicationRemindersQueue = new Queue('medication-reminders', {
  connection: redisConnection as any,
  defaultJobOptions,
});

export const logGenerationQueue = new Queue('log-generation', {
  connection: redisConnection as any,
  defaultJobOptions,
});

export const caregiverEscalationQueue = new Queue('caregiver-escalation', {
  connection: redisConnection as any,
  defaultJobOptions,
});

export const analyticsPrecomputeQueue = new Queue('analytics-precompute', {
  connection: redisConnection as any,
  defaultJobOptions,
});

export const notificationCleanupQueue = new Queue('notification-cleanup', {
  connection: redisConnection as any,
  defaultJobOptions,
});
