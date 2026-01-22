/**
 * Shared Test Container Instances
 *
 * This module provides singleton instances of test containers
 * that are started once and shared across all test files.
 */

import { startTestDatabase, stopTestDatabase } from './test-db';
import { startTestRedis, stopTestRedis } from './test-redis';
import type { TestDatabase } from './test-db';
import type { TestRedis } from './test-redis';

let testDb: TestDatabase | null = null;
let testRedis: TestRedis | null = null;

/**
 * Get or start the PostgreSQL test container
 */
export async function getTestDb(): Promise<TestDatabase> {
  if (!testDb) {
    testDb = await startTestDatabase();
  }
  return testDb;
}

/**
 * Get or start the Redis test container
 */
export async function getTestRedis(): Promise<TestRedis> {
  if (!testRedis) {
    testRedis = await startTestRedis();
  }
  return testRedis;
}

/**
 * Cleanup all test containers
 * Call this in afterAll hooks
 */
export async function cleanupTestContainers(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (testDb) {
    promises.push(stopTestDatabase(testDb));
    testDb = null;
  }

  if (testRedis) {
    promises.push(stopTestRedis(testRedis));
    testRedis = null;
  }

  await Promise.all(promises);
}
