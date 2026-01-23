/**
 * @ai-cd/core - Core orchestration engine, state machine, and database schema
 *
 * This package provides the foundational infrastructure for the AI-CD system.
 */

export { createDbClient } from './db/index';
export type { DbClient } from './db/index';
export * as schema from './db/schema/index';
