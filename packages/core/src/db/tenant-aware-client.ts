/**
 * Tenant-Aware Database Client
 *
 * Wraps Drizzle queries to automatically apply tenant filtering.
 * Ensures all multi-tenant table queries are scoped to the current tenant.
 */

import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { getCurrentTenantId, hasTenantContext } from '../context';
import type { DbClient } from './index';

/**
 * Error thrown when attempting tenant-scoped query without context
 */
export class TenantScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

/**
 * Error thrown when attempting to access another tenant's data
 */
export class TenantAccessDeniedError extends Error {
  constructor(tenantId: string, resourceType: string) {
    super(`Access denied: Cannot access ${resourceType} belonging to tenant ${tenantId}`);
    this.name = 'TenantAccessDeniedError';
  }
}

/**
 * Check if a table has a tenantId column
 * @param table - Drizzle table definition
 * @returns True if table has tenantId column
 */
function hasTenantIdColumn(table: PgTable): boolean {
  return 'tenantId' in table;
}

/**
 * Get the tenantId column from a table
 * @param table - Drizzle table definition
 * @returns The tenantId column
 */
function getTenantIdColumn(table: PgTable) {
  if (!hasTenantIdColumn(table)) {
    throw new Error(`Table ${table} does not have a tenantId column`);
  }
  return (table as any).tenantId;
}

/**
 * Get the tenant filter condition for a table
 * @param table - Table to filter
 * @returns SQL condition for tenant filtering
 */
function getTenantFilterCondition(table: PgTable): SQL {
  const currentTenantId = getCurrentTenantId();
  const tenantIdColumn = getTenantIdColumn(table);
  return eq(tenantIdColumn, currentTenantId);
}

/**
 * Create a proxy that intercepts .where() calls to inject tenant filtering
 * @param builder - Original query builder
 * @param table - Table being queried
 * @returns Proxied builder with tenant filtering
 */
function createTenantFilterProxy<T extends object>(builder: T, table: PgTable): T {
  return new Proxy(builder, {
    get(target: any, prop: string | symbol) {
      const original = target[prop];

      // Intercept .where() calls
      if (prop === 'where' && typeof original === 'function') {
        return function(condition: SQL | undefined) {
          const tenantFilter = getTenantFilterCondition(table);

          // Combine tenant filter with user condition using AND
          const combined = condition
            ? and(tenantFilter, condition)
            : tenantFilter;

          return original.call(target, combined);
        };
      }

      // Pass through all other properties/methods
      return original;
    }
  });
}

/**
 * Apply tenant filter immediately (for SELECT queries)
 * @param qb - Query builder
 * @param table - Table being queried
 * @returns Query builder with tenant filter applied
 */
export function withImmediateTenantFilter<T extends object>(qb: T, table: PgTable): T {
  if (!hasTenantIdColumn(table)) {
    // Table is not multi-tenant, return query as-is
    return qb;
  }

  if (!hasTenantContext()) {
    throw new TenantScopeError(
      `Attempted to query multi-tenant table ${table} without tenant context`
    );
  }

  const currentTenantId = getCurrentTenantId();
  const tenantIdColumn = getTenantIdColumn(table);

  // Apply WHERE tenantId = currentTenantId filter immediately
  return (qb as any).where(eq(tenantIdColumn, currentTenantId));
}

/**
 * Verify that an entity belongs to the current tenant
 * @param entity - Entity to check
 * @param resourceType - Type of resource for error messages
 * @throws TenantAccessDeniedError if entity belongs to different tenant
 */
export function verifyTenantOwnership(
  entity: { tenantId: string } | null | undefined,
  resourceType: string
): void {
  if (!entity) {
    return; // Will be handled as "not found"
  }

  if (!hasTenantContext()) {
    throw new TenantScopeError(
      `Attempted to verify ownership of ${resourceType} without tenant context`
    );
  }

  const currentTenantId = getCurrentTenantId();

  if (entity.tenantId !== currentTenantId) {
    throw new TenantAccessDeniedError(entity.tenantId, resourceType);
  }
}

/**
 * Create a proxy for update operations that intercepts .set() and then .where()
 * @param builder - Original update builder
 * @param table - Table being updated
 * @returns Proxied builder with tenant filtering
 */
function createUpdateProxy<T extends object>(builder: T, table: PgTable): T {
  return new Proxy(builder, {
    get(target: any, prop: string | symbol) {
      const original = target[prop];

      // Intercept .set() calls to return a proxied builder with .where() interception
      if (prop === 'set' && typeof original === 'function') {
        return function(...args: any[]) {
          const setResult = original.apply(target, args);
          // Now proxy the result to intercept .where()
          return createTenantFilterProxy(setResult, table);
        };
      }

      // Pass through all other properties/methods
      return original;
    }
  });
}

/**
 * Create a tenant-aware database client wrapper
 * @param db - Base Drizzle client
 * @returns Wrapped client with tenant-aware query methods
 */
export function createTenantAwareClient(db: DbClient) {
  return {
    /**
     * Original Drizzle client (use with caution - bypasses tenant filtering)
     */
    raw: db,

    /**
     * Select with automatic tenant filtering
     */
    select: (table: PgTable) => {
      return withImmediateTenantFilter(db.select().from(table), table);
    },

    /**
     * Insert with automatic tenant ID injection
     */
    insert: (table: PgTable) => {
      const insertBuilder = db.insert(table);

      if (hasTenantIdColumn(table) && hasTenantContext()) {
        // Wrap values() to inject tenantId
        const originalValues = insertBuilder.values.bind(insertBuilder);
        insertBuilder.values = (values: any) => {
          const currentTenantId = getCurrentTenantId();

          // Inject tenantId into values
          if (Array.isArray(values)) {
            values = values.map(v => ({ ...v, tenantId: currentTenantId }));
          } else {
            values = { ...values, tenantId: currentTenantId };
          }

          return originalValues(values);
        };
      }

      return insertBuilder;
    },

    /**
     * Update with automatic tenant filtering
     */
    update: (table: PgTable) => {
      if (!hasTenantIdColumn(table)) {
        return db.update(table);
      }

      if (!hasTenantContext()) {
        throw new TenantScopeError(
          `Attempted to update multi-tenant table ${table} without tenant context`
        );
      }

      return createUpdateProxy(db.update(table), table);
    },

    /**
     * Delete with automatic tenant filtering
     */
    delete: (table: PgTable) => {
      if (!hasTenantIdColumn(table)) {
        return db.delete(table);
      }

      if (!hasTenantContext()) {
        throw new TenantScopeError(
          `Attempted to delete from multi-tenant table ${table} without tenant context`
        );
      }

      // Return a proxy that intercepts .where() calls to inject tenant filter
      return createTenantFilterProxy(db.delete(table), table);
    },

    /**
     * Verify entity ownership
     */
    verifyOwnership: verifyTenantOwnership
  };
}

export type TenantAwareClient = ReturnType<typeof createTenantAwareClient>;
