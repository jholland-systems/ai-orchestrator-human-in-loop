/**
 * Tenant Context Management
 *
 * Provides tenant isolation using AsyncLocalStorage.
 * The tenantId is set at the request boundary and available
 * throughout the call stack without explicit parameter passing.
 */

import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  organizationId?: string;
}

// Global AsyncLocalStorage instance for tenant context
const tenantContextStore = new AsyncLocalStorage<TenantContext>();

/**
 * Run a function with tenant context
 * @param context - Tenant context to set
 * @param fn - Function to execute with context
 * @returns Result of the function
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T
): T {
  return tenantContextStore.run(context, fn);
}

/**
 * Run an async function with tenant context
 * @param context - Tenant context to set
 * @param fn - Async function to execute with context
 * @returns Promise result of the function
 */
export async function runWithTenantContextAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantContextStore.run(context, fn);
}

/**
 * Get the current tenant context
 * @throws Error if called outside of tenant context
 * @returns Current tenant context
 */
export function getCurrentTenantContext(): TenantContext {
  const context = tenantContextStore.getStore();

  if (!context) {
    throw new TenantContextError(
      'No tenant context available. Ensure operation is running within runWithTenantContext().'
    );
  }

  return context;
}

/**
 * Get the current tenant ID
 * @throws Error if called outside of tenant context
 * @returns Current tenant ID
 */
export function getCurrentTenantId(): string {
  return getCurrentTenantContext().tenantId;
}

/**
 * Get the current organization ID (if available)
 * @returns Current organization ID or undefined
 */
export function getCurrentOrganizationId(): string | undefined {
  const context = tenantContextStore.getStore();
  return context?.organizationId;
}

/**
 * Check if we're currently running within a tenant context
 * @returns True if tenant context is available
 */
export function hasTenantContext(): boolean {
  return tenantContextStore.getStore() !== undefined;
}

/**
 * Custom error for tenant context issues
 */
export class TenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantContextError';
  }
}
