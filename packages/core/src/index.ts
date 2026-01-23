/**
 * @ai-cd/core - Core orchestration engine, state machine, and database schema
 *
 * This package provides the foundational infrastructure for the AI-CD system.
 */

// Database
export { createDbClient } from './db/index.js';
export type { DbClient } from './db/index.js';
export * as schema from './db/schema/index.js';

// Tenant-aware database client
export {
  createTenantAwareClient,
  TenantScopeError,
  TenantAccessDeniedError
} from './db/tenant-aware-client.js';
export type { TenantAwareClient } from './db/tenant-aware-client.js';

// Tenant context management
export {
  runWithTenantContext,
  runWithTenantContextAsync,
  getCurrentTenantContext,
  getCurrentTenantId,
  getCurrentOrganizationId,
  hasTenantContext,
  TenantContextError
} from './context/index.js';
export type { TenantContext } from './context/index.js';

// State machine
export {
  JobState,
  JobEvent,
  VALID_TRANSITIONS,
  isValidTransition,
  getNextState,
  JobStateMachine,
  JobStateError
} from './state-machine/index.js';

// Agents
export { isAgent, MockAgent } from './agents/index.js';
export type { IAgent, MockAgentOptions } from './agents/index.js';

// Jobs
export type {
  AicdJob,
  JobPayload,
  QueuedPayload,
  PlanningPayload,
  CodingPayload,
  ReviewingPayload,
  PrOpenPayload,
  CompletedPayload,
  FailedPayload,
  PlanResult,
  CodeResult,
  FileChange,
  ReviewResult,
  JobContext
} from './jobs/types.js';

// Queues
export {
  getPlanningQueue,
  getCodingQueue,
  getReviewingQueue,
  getPrOpenQueue,
  getQueue,
  closeAllQueues,
  getRedisConnection,
  QUEUE_NAMES,
  getDefaultQueueOptions,
  getDefaultWorkerOptions,
  DEFAULT_QUEUE_OPTIONS,
  DEFAULT_WORKER_OPTIONS
} from './queues/index.js';
