/**
 * PostgreSQL Testcontainer Utility
 *
 * Provides a real PostgreSQL 16 instance for integration testing.
 * Uses alpine variant for faster startup and smaller image size.
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export interface TestDatabase {
  container: StartedPostgreSqlContainer;
  connectionString: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

/**
 * Start a PostgreSQL container for testing
 * @returns Started container with connection details
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  console.log('🐘 Starting PostgreSQL container...');

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aicd_test')
    .withUsername('aicd_test')
    .withPassword('aicd_test_password')
    .withExposedPorts(5432)
    .start();

  const host = container.getHost();
  const port = container.getPort();
  const database = container.getDatabase();
  const username = container.getUsername();
  const password = container.getPassword();
  const connectionString = `postgres://${username}:${password}@${host}:${port}/${database}`;

  console.log(`✅ PostgreSQL ready at ${host}:${port}`);

  return {
    container,
    connectionString,
    host,
    port,
    database,
    username,
    password
  };
}

/**
 * Stop and cleanup PostgreSQL container
 */
export async function stopTestDatabase(testDb: TestDatabase): Promise<void> {
  console.log('🛑 Stopping PostgreSQL container...');
  await testDb.container.stop();
  console.log('✅ PostgreSQL stopped');
}
