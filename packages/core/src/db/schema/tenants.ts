/**
 * Tenants Schema
 *
 * Tenants represent GitHub App installations and are the primary
 * boundary for multi-tenancy. Each tenant has its own isolated data.
 */

import { pgTable, uuid, bigint, varchar, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { plans } from './plans.js';

export const installationStatusEnum = pgEnum('installation_status_enum', [
  'pending',
  'active',
  'suspended'
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  githubInstallationId: bigint('github_installation_id', { mode: 'number' }).notNull().unique(),
  githubAccountLogin: varchar('github_account_login', { length: 255 }).notNull(),
  githubAccountType: varchar('github_account_type', { length: 50 }).notNull(),
  installedAt: timestamp('installed_at', { withTimezone: true }).notNull(),
  uninstalledAt: timestamp('uninstalled_at', { withTimezone: true }),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  installationStatus: installationStatusEnum('installation_status').notNull().default('pending'),
  planId: uuid('plan_id').notNull().references(() => plans.id),
  planChangedAt: timestamp('plan_changed_at', { withTimezone: true })
}, (table) => ({
  installationStatusIdx: index('idx_tenants_installation_status').on(table.installationStatus)
}));

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
