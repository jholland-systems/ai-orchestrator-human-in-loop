/**
 * Redis Testcontainer Utility
 *
 * Provides a real Redis 7 instance for integration testing.
 * Uses alpine variant for faster startup and smaller image size.
 */

import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';

export interface TestRedis {
  container: StartedRedisContainer;
  connectionString: string;
  host: string;
  port: number;
}

/**
 * Start a Redis container for testing
 * @returns Started container with connection details
 */
export async function startTestRedis(): Promise<TestRedis> {
  console.log('🔴 Starting Redis container...');

  const container = await new RedisContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const host = container.getHost();
  const port = container.getPort();
  const connectionString = `redis://${host}:${port}`;

  console.log(`✅ Redis ready at ${host}:${port}`);

  return {
    container,
    connectionString,
    host,
    port
  };
}

/**
 * Stop and cleanup Redis container
 */
export async function stopTestRedis(testRedis: TestRedis): Promise<void> {
  console.log('🛑 Stopping Redis container...');
  await testRedis.container.stop();
  console.log('✅ Redis stopped');
}
