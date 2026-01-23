/**
 * Queues Module
 *
 * Exports queue getter functions and configuration.
 */

export {
  getPlanningQueue,
  getCodingQueue,
  getReviewingQueue,
  getPrOpenQueue,
  getQueue,
  closeAllQueues
} from './queues.js';

export {
  getRedisConnection,
  QUEUE_NAMES,
  getDefaultQueueOptions,
  getDefaultWorkerOptions,
  DEFAULT_QUEUE_OPTIONS,
  DEFAULT_WORKER_OPTIONS
} from './config.js';
