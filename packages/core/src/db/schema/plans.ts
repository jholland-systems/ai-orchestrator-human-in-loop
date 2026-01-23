/**
 * Plans Schema
 *
 * Defines subscription plans with usage limits and features.
 * Referenced by tenants for quota enforcement.
 */

import { pgTable, uuid, varchar, text, decimal, integer, bigint, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull().default('0.00'),
  billingInterval: varchar('billing_interval', { length: 20 }).notNull().default('monthly'),
  maxRepos: integer('max_repos').notNull().default(3),
  maxPrsPerMonth: integer('max_prs_per_month').notNull().default(10),
  maxTokensPerMonth: bigint('max_tokens_per_month', { mode: 'number' }).notNull().default(1000000),
  maxLlmCallsPerMonth: integer('max_llm_calls_per_month').notNull().default(100),
  features: jsonb('features').$type<Record<string, unknown>>().default({}),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
