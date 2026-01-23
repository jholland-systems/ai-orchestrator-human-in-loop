/**
 * Database Client Factory
 *
 * Provides a type-safe Drizzle client configured with the application schema.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type DbClient = ReturnType<typeof createDbClient>;

/**
 * Create a database client with the application schema
 * @param connectionString - PostgreSQL connection string
 * @returns Configured Drizzle client
 */
export function createDbClient(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

export { schema };
