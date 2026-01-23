/**
 * Queue Configuration
 *
 * Redis connection and BullMQ queue configuration.
 */

import type { ConnectionOptions } from 'bullmq';

/**
 * Get Redis connection options from environment
 */
export function getRedisConnection(): ConnectionOptions {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // Parse Redis URL
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    ...(url.password && { password: url.password })
  };
}

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  PLANNING: 'planning',
  CODING: 'coding',
  REVIEWING: 'reviewing',
  PR_OPEN: 'pr-open'
} as const;

/**
 * Get default queue options (lazy evaluation for Redis connection)
 */
export function getDefaultQueueOptions() {
  return {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000
      },
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000 // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 7 * 24 * 3600 // Keep failed jobs for 7 days
      }
    }
  };
}

/**
 * Get default worker options (lazy evaluation for Redis connection)
 */
export function getDefaultWorkerOptions() {
  return {
    connection: getRedisConnection(),
    concurrency: 5, // Process 5 jobs concurrently per worker
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000 // Per second
    }
  };
}

/**
 * Legacy exports (deprecated - use getter functions)
 * @deprecated Use getDefaultQueueOptions() instead
 */
export const DEFAULT_QUEUE_OPTIONS = getDefaultQueueOptions();

/**
 * Legacy exports (deprecated - use getter functions)
 * @deprecated Use getDefaultWorkerOptions() instead
 */
export const DEFAULT_WORKER_OPTIONS = getDefaultWorkerOptions();
