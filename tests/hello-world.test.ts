/**
 * Phase 1 Gate: Hello World Integration Test
 *
 * Validates the complete test infrastructure:
 * - Testcontainers successfully start PostgreSQL
 * - Drizzle migrations run correctly
 * - Database client can insert and retrieve data
 *
 * Gate Criteria: This test must pass with real dockerized database
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, schema } from '@ai-cd/core';
import type { DbClient } from '@ai-cd/core';
import { runMigrations } from '@ai-cd/core/db/migrate';
import { getTestDb, cleanupTestContainers } from './utils/global-setup';

const { jobs } = schema;

describe('Phase 1 Gate: Hello World Integration Test', () => {
  let db: DbClient;

  beforeAll(async () => {
    // Get or start the test database container
    const testDb = await getTestDb();

    // Run migrations against the Testcontainer database
    await runMigrations(testDb.connectionString);

    // Create database client
    db = createDbClient(testDb.connectionString);
  });

  afterAll(async () => {
    // Cleanup containers after all tests
    await cleanupTestContainers();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await db.delete(jobs);
  });

  it('should insert a job and retrieve it', async () => {
    // Insert a new job
    const [insertedJob] = await db
      .insert(jobs)
      .values({ status: 'QUEUED' })
      .returning();

    // Validate insertion
    expect(insertedJob).toBeDefined();
    expect(insertedJob.id).toBeDefined();
    expect(insertedJob.status).toBe('QUEUED');
    expect(insertedJob.createdAt).toBeInstanceOf(Date);
    expect(insertedJob.updatedAt).toBeInstanceOf(Date);

    // Retrieve the job
    const [retrievedJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, insertedJob.id));

    // Validate retrieval
    expect(retrievedJob).toBeDefined();
    expect(retrievedJob.id).toBe(insertedJob.id);
    expect(retrievedJob.status).toBe('QUEUED');
  });

  it('should insert multiple jobs', async () => {
    // Insert multiple jobs
    const insertedJobs = await db
      .insert(jobs)
      .values([
        { status: 'QUEUED' },
        { status: 'PLANNING' },
        { status: 'CODING' }
      ])
      .returning();

    // Validate insertions
    expect(insertedJobs).toHaveLength(3);
    expect(insertedJobs[0]?.status).toBe('QUEUED');
    expect(insertedJobs[1]?.status).toBe('PLANNING');
    expect(insertedJobs[2]?.status).toBe('CODING');

    // Verify all jobs are in database
    const allJobs = await db.select().from(jobs);
    expect(allJobs).toHaveLength(3);
  });

  it('should update job status', async () => {
    // Insert a job
    const [job] = await db
      .insert(jobs)
      .values({ status: 'QUEUED' })
      .returning();

    expect(job).toBeDefined();

    // Update the job status
    const [updatedJob] = await db
      .update(jobs)
      .set({ status: 'PLANNING', updatedAt: new Date() })
      .where(eq(jobs.id, job.id))
      .returning();

    // Validate update
    expect(updatedJob).toBeDefined();
    expect(updatedJob.id).toBe(job.id);
    expect(updatedJob.status).toBe('PLANNING');
    expect(updatedJob.updatedAt.getTime()).toBeGreaterThan(job.updatedAt.getTime());
  });

  it('should handle metadata field', async () => {
    // Insert a job with metadata
    const metadata = {
      issueNumber: 123,
      repository: 'test/repo',
      labels: ['bug', 'priority-high']
    };

    const [job] = await db
      .insert(jobs)
      .values({ status: 'QUEUED', metadata })
      .returning();

    expect(job).toBeDefined();
    expect(job.metadata).toEqual(metadata);

    // Retrieve and validate metadata
    const [retrievedJob] = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, job.id));

    expect(retrievedJob?.metadata).toEqual(metadata);
  });

  it('should use default values correctly', async () => {
    // Insert a job with minimal data (should use defaults)
    const [job] = await db
      .insert(jobs)
      .values({})
      .returning();

    // Validate defaults
    expect(job).toBeDefined();
    expect(job.id).toBeDefined(); // UUID generated
    expect(job.status).toBe('QUEUED'); // Default status
    expect(job.createdAt).toBeInstanceOf(Date);
    expect(job.updatedAt).toBeInstanceOf(Date);
    expect(job.metadata).toEqual({}); // Default empty object
  });
});
