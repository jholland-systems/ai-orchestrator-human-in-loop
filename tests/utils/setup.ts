/**
 * Global Test Setup
 *
 * Starts PostgreSQL and Redis containers before all tests.
 * Containers are reused across test files for efficiency.
 * Stops containers after all tests complete.
 */

import { startTestDatabase, stopTestDatabase } from './test-db.js';
import { startTestRedis, stopTestRedis } from './test-redis.js';
import type { TestDatabase } from './test-db.js';
import type { TestRedis } from './test-redis.js';

declare global {
  // eslint-disable-next-line no-var
  var testDb: TestDatabase;
  // eslint-disable-next-line no-var
  var testRedis: TestRedis;
}

export async function setup(): Promise<void> {
  console.log('\n🚀 Starting test infrastructure...\n');

  // Start containers in parallel for speed
  const [testDb, testRedis] = await Promise.all([
    startTestDatabase(),
    startTestRedis()
  ]);

  // Make available globally to all test files
  global.testDb = testDb;
  global.testRedis = testRedis;

  console.log('\n✅ Test infrastructure ready\n');
}

export async function teardown(): Promise<void> {
  console.log('\n🧹 Cleaning up test infrastructure...\n');

  // Stop containers in parallel
  await Promise.all([
    stopTestDatabase(global.testDb),
    stopTestRedis(global.testRedis)
  ]);

  console.log('\n✅ Test infrastructure cleaned up\n');
}
