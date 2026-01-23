/**
 * @ai-cd/core - Core orchestration engine, state machine, and database schema
 *
 * This package provides the foundational infrastructure for the AI-CD system.
 */

// Database
export { createDbClient } from './db/index';
export type { DbClient } from './db/index';
export * as schema from './db/schema/index';

// Tenant-aware database client
export {
  createTenantAwareClient,
  TenantScopeError,
  TenantAccessDeniedError
} from './db/tenant-aware-client';
export type { TenantAwareClient } from './db/tenant-aware-client';

// Tenant context management
export {
  runWithTenantContext,
  runWithTenantContextAsync,
  getCurrentTenantContext,
  getCurrentTenantId,
  getCurrentOrganizationId,
  hasTenantContext,
  TenantContextError
} from './context';
export type { TenantContext } from './context';
