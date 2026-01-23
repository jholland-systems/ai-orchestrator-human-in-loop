/**
 * BullMQ Queues
 *
 * Queue instances for each processing stage of the AI-CD workflow.
 * Uses lazy initialization to avoid connecting to Redis at module load time.
 */

import { Queue } from 'bullmq';
import { QUEUE_NAMES, getDefaultQueueOptions } from './config.js';
import type { AicdJob } from '../jobs/types.js';

// Lazy-initialized queue instances
let _planningQueue: Queue<AicdJob> | null = null;
let _codingQueue: Queue<AicdJob> | null = null;
let _reviewingQueue: Queue<AicdJob> | null = null;
let _prOpenQueue: Queue<AicdJob> | null = null;

/**
 * Get or create planning queue
 */
export function getPlanningQueue(): Queue<AicdJob> {
  if (!_planningQueue) {
    _planningQueue = new Queue<AicdJob>(
      QUEUE_NAMES.PLANNING,
      getDefaultQueueOptions()
    );
  }
  return _planningQueue;
}

/**
 * Get or create coding queue
 */
export function getCodingQueue(): Queue<AicdJob> {
  if (!_codingQueue) {
    _codingQueue = new Queue<AicdJob>(
      QUEUE_NAMES.CODING,
      getDefaultQueueOptions()
    );
  }
  return _codingQueue;
}

/**
 * Get or create reviewing queue
 */
export function getReviewingQueue(): Queue<AicdJob> {
  if (!_reviewingQueue) {
    _reviewingQueue = new Queue<AicdJob>(
      QUEUE_NAMES.REVIEWING,
      getDefaultQueueOptions()
    );
  }
  return _reviewingQueue;
}

/**
 * Get or create PR open queue
 */
export function getPrOpenQueue(): Queue<AicdJob> {
  if (!_prOpenQueue) {
    _prOpenQueue = new Queue<AicdJob>(
      QUEUE_NAMES.PR_OPEN,
      getDefaultQueueOptions()
    );
  }
  return _prOpenQueue;
}

// Note: Queue instances are lazy-initialized via getter functions above.
// Do NOT export instances directly to avoid connecting to Redis at module load time.

/**
 * Get queue by name
 */
export function getQueue(name: string): Queue<AicdJob> {
  switch (name) {
    case QUEUE_NAMES.PLANNING:
      return getPlanningQueue();
    case QUEUE_NAMES.CODING:
      return getCodingQueue();
    case QUEUE_NAMES.REVIEWING:
      return getReviewingQueue();
    case QUEUE_NAMES.PR_OPEN:
      return getPrOpenQueue();
    default:
      throw new Error(`Unknown queue: ${name}`);
  }
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  const queuesToClose = [
    _planningQueue,
    _codingQueue,
    _reviewingQueue,
    _prOpenQueue
  ].filter((q): q is Queue<AicdJob> => q !== null);

  await Promise.all(queuesToClose.map(q => q.close()));

  // Reset instances
  _planningQueue = null;
  _codingQueue = null;
  _reviewingQueue = null;
  _prOpenQueue = null;
}
