/**
 * PR Open Worker
 *
 * Processes jobs in the PR open queue.
 * Simulates opening a pull request (in Phase 3, this is mocked).
 * In Phase 5, this will integrate with GitHub API via Octokit.
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import {
  createDbClient,
  JobEvent,
  JobStateMachine,
  getDefaultWorkerOptions,
  QUEUE_NAMES
} from '@ai-cd/core';
import type { AicdJob } from '@ai-cd/core';

/**
 * Create PR open worker
 *
 * @param dbConnectionString - Database connection string
 * @returns BullMQ worker instance
 */
export function createPrOpenWorker(dbConnectionString: string) {
  const db = createDbClient(dbConnectionString);
  const stateMachine = new JobStateMachine(db);

  return new Worker<AicdJob>(
    QUEUE_NAMES.PR_OPEN,
    async (job: Job<AicdJob>) => {
      const aicdJob = job.data;
      // payload will be used in Phase 5 for actual PR creation
      // const payload = aicdJob.payload as PrOpenPayload;

      try {
        console.log(`[PrOpenWorker] Processing job ${aicdJob.jobId}`);

        // In Phase 3, we just simulate PR creation
        // In Phase 5, this will call GitHub API
        // Add small delay to simulate PR creation time and allow tests to observe PR_OPEN state
        await new Promise(resolve => setTimeout(resolve, 100));

        const mockPrNumber = Math.floor(Math.random() * 1000) + 1;
        const mockPrUrl = `https://github.com/example/repo/pull/${mockPrNumber}`;

        console.log(`[PrOpenWorker] Simulated PR creation for job ${aicdJob.jobId}: ${mockPrUrl}`);

        // Transition to COMPLETED state (PR_OPENED event transitions from PR_OPEN to COMPLETED)
        await stateMachine.transition(aicdJob.jobId, JobEvent.PR_OPENED);

        console.log(`[PrOpenWorker] Job ${aicdJob.jobId} completed`);

        return {
          success: true,
          prNumber: mockPrNumber,
          prUrl: mockPrUrl
        };
      } catch (error) {
        console.error(`[PrOpenWorker] Error processing job ${aicdJob.jobId}:`, error);

        // Transition to FAILED state
        await stateMachine.transition(
          aicdJob.jobId,
          JobEvent.PR_FAILED,
          error instanceof Error ? error.message : String(error)
        );

        throw error;
      }
    },
    getDefaultWorkerOptions()
  );
}
