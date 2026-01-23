/**
 * Phase 3 Gate: Orchestrator Integration Test
 *
 * Validates that:
 * - Jobs can be created and submitted to queues
 * - Workers process jobs using MockAgent
 * - Jobs transition through all states correctly
 * - State machine updates database properly
 * - MockAgent simulates AI operations without real LLM calls
 *
 * Gate Criteria: Job moves from QUEUED → PLANNING → CODING → REVIEWING → PR_OPEN → COMPLETED
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  createDbClient,
  JobState,
  MockAgent,
  getPlanningQueue,
  closeAllQueues,
  schema
} from '@ai-cd/core';
import type { DbClient } from '@ai-cd/core';
import { runMigrations } from '@ai-cd/core/db/migrate';
import { getTestDb, cleanupTestContainers } from './utils/global-setup';

const { jobs } = schema;
import { startTestRedis, stopTestRedis } from './utils/test-redis';
import type { TestRedis } from './utils/test-redis';
import {
  createPlanningWorker,
  createCodingWorker,
  createReviewingWorker,
  createPrOpenWorker
} from '@ai-cd/backend';
import type { Worker } from 'bullmq';

describe('Phase 3 Gate: Orchestrator Integration', () => {
  let db: DbClient;
  let testRedis: TestRedis;
  let workers: Worker[];
  let dbConnectionString: string;

  beforeAll(async () => {
    // Start PostgreSQL container
    const testDb = await getTestDb();
    dbConnectionString = testDb.connectionString;

    // Run migrations
    await runMigrations(dbConnectionString);
    db = createDbClient(dbConnectionString);

    // Start Redis container
    testRedis = await startTestRedis();

    // Set Redis URL for BullMQ
    process.env.REDIS_URL = testRedis.connectionString;

    // Create mock agent
    const mockAgent = new MockAgent({
      delayMs: 50 // Fast for testing
    });

    // Start workers
    const planningWorker = createPlanningWorker(mockAgent, dbConnectionString);
    const codingWorker = createCodingWorker(mockAgent, dbConnectionString);
    const reviewingWorker = createReviewingWorker(mockAgent, dbConnectionString);
    const prOpenWorker = createPrOpenWorker(dbConnectionString);

    workers = [planningWorker, codingWorker, reviewingWorker, prOpenWorker];

    console.log('✅ All workers started');
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    // Stop workers
    await Promise.all(workers.map(w => w.close()));
    console.log('✅ All workers stopped');

    // Close queues
    await closeAllQueues();
    console.log('✅ All queues closed');

    // Stop containers
    await stopTestRedis(testRedis);
    await cleanupTestContainers();
  });

  it('should process a job through all states successfully', async () => {
    // Create job in database
    const jobRecords = await db.insert(jobs).values({
      status: JobState.QUEUED,
      metadata: {}
    }).returning();

    expect(jobRecords).toHaveLength(1);
    const job = jobRecords[0]!;
    const jobId = job.id;

    console.log(`📝 Created job ${jobId}`);

    // Submit to planning queue
    const planningQueue = getPlanningQueue();
    await planningQueue.add(
      `job-${jobId}`,
      {
        jobId,
        tenantId: 'test-tenant',
        repositoryId: 'test-repo',
        issueNumber: 123,
        currentState: JobState.QUEUED,
        payload: {
          type: 'queued',
          issueTitle: 'Test Issue',
          issueBody: 'This is a test issue',
          issueUrl: 'https://github.com/test/repo/issues/123'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { jobId }
    );

    console.log(`📤 Job ${jobId} submitted to planning queue`);

    // Wait for job to complete (with timeout)
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 500; // Check every 500ms
    let waited = 0;
    let finalState = JobState.QUEUED;

    while (waited < maxWaitTime) {
      const jobRecords = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, jobId));

      if (jobRecords.length > 0) {
        finalState = jobRecords[0]!.status as JobState;
        console.log(`   Current state: ${finalState} (waited ${waited}ms)`);

        if (finalState === JobState.COMPLETED || finalState === JobState.FAILED) {
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    // Verify final state
    expect(finalState).toBe(JobState.COMPLETED);

    // Get final job record
    const finalJobRecords = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));

    expect(finalJobRecords).toHaveLength(1);
    const finalJob = finalJobRecords[0]!;

    // Verify job completed successfully
    expect(finalJob.status).toBe(JobState.COMPLETED);
    expect(finalJob.id).toBe(jobId);

    console.log(`✅ Job ${jobId} completed successfully`);
  }, 60000); // 60s timeout for full workflow

  it('should handle job state transitions correctly', async () => {
    // This test verifies the state machine logic
    const jobRecords = await db.insert(jobs).values({
      status: JobState.QUEUED,
      metadata: {}
    }).returning();

    expect(jobRecords).toHaveLength(1);
    const job = jobRecords[0]!;
    const jobId = job.id;

    // Submit job and track state changes
    const planningQueue = getPlanningQueue();
    await planningQueue.add(
      `job-${jobId}`,
      {
        jobId,
        tenantId: 'test-tenant-2',
        repositoryId: 'test-repo-2',
        issueNumber: 456,
        currentState: JobState.QUEUED,
        payload: {
          type: 'queued',
          issueTitle: 'State Transition Test',
          issueBody: 'Testing state transitions',
          issueUrl: 'https://github.com/test/repo/issues/456'
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { jobId }
    );

    // Wait for completion
    const maxWaitTime = 30000;
    const checkInterval = 50; // Poll every 50ms to catch fast state transitions
    let waited = 0;
    const stateHistory: JobState[] = [JobState.QUEUED];

    while (waited < maxWaitTime) {
      const jobRecords = await db
        .select()
        .from(jobs)
        .where(eq(jobs.id, jobId));

      if (jobRecords.length > 0) {
        const currentState = jobRecords[0]!.status as JobState;

        // Record state if it changed
        if (currentState !== stateHistory[stateHistory.length - 1]) {
          stateHistory.push(currentState);
          console.log(`   State changed: ${currentState}`);
        }

        if (currentState === JobState.COMPLETED || currentState === JobState.FAILED) {
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    // Verify state progression
    // Expected: QUEUED → PLANNING → CODING → REVIEWING → PR_OPEN → COMPLETED
    expect(stateHistory).toContain(JobState.QUEUED);
    expect(stateHistory).toContain(JobState.PLANNING);
    expect(stateHistory).toContain(JobState.CODING);
    expect(stateHistory).toContain(JobState.REVIEWING);
    expect(stateHistory).toContain(JobState.PR_OPEN);
    expect(stateHistory).toContain(JobState.COMPLETED);

    console.log(`✅ State history:`, stateHistory);
  }, 60000);
});
