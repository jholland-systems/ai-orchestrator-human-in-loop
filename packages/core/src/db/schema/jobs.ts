/**
 * Jobs Table Schema
 *
 * Minimal schema for Phase 1 - tracks job lifecycle through the system.
 * Will be expanded in Phase 2 with tenant isolation and relationships.
 */

import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 50 }).notNull().default('QUEUED'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({})
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
