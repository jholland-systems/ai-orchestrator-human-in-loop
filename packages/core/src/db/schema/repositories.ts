/**
 * Repositories Schema
 *
 * Represents GitHub repositories monitored by the system.
 * Each repository belongs to exactly one tenant (multi-tenant isolation).
 */

import { pgTable, uuid, bigint, varchar, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

export const repositories = pgTable('repositories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  githubRepoId: bigint('github_repo_id', { mode: 'number' }).notNull().unique(),
  owner: varchar('owner', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 510 }).notNull(),
  enabled: boolean('enabled').notNull().default(true),
  policyOverrides: jsonb('policy_overrides').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  tenantIdIdx: index('idx_repositories_tenant_id').on(table.tenantId),
  githubRepoIdIdx: index('idx_repositories_github_repo_id').on(table.githubRepoId)
}));

export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
