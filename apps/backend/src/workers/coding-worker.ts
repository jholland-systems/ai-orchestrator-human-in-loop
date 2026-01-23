/**
 * Coding Worker
 *
 * Processes jobs in the coding queue.
 * Calls the IAgent.code() method to generate code changes based on the plan.
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import {
  createDbClient,
  JobEvent,
  JobStateMachine,
  getReviewingQueue,
  getDefaultWorkerOptions,
  QUEUE_NAMES
} from '@ai-cd/core';
import type { AicdJob, IAgent, JobContext, CodingPayload } from '@ai-cd/core';

/**
 * Create coding worker
 *
 * @param agent - AI agent implementation
 * @param dbConnectionString - Database connection string
 * @returns BullMQ worker instance
 */
export function createCodingWorker(agent: IAgent, dbConnectionString: string) {
  const db = createDbClient(dbConnectionString);
  const stateMachine = new JobStateMachine(db);

  return new Worker<AicdJob>(
    QUEUE_NAMES.CODING,
    async (job: Job<AicdJob>) => {
      const aicdJob = job.data;
      const payload = aicdJob.payload as CodingPayload;

      try {
        console.log(`[CodingWorker] Processing job ${aicdJob.jobId}`);

        // Note: Job is already in CODING state (transitioned by planning worker or reviewing worker)
        // No need to transition again - just proceed with coding

        // Build context for agent
        const context: JobContext = {
          jobId: aicdJob.jobId,
          tenantId: aicdJob.tenantId,
          repositoryId: aicdJob.repositoryId,
          issueNumber: aicdJob.issueNumber,
          issueTitle: '', // Would need to store this in job metadata
          issueBody: '',
          issueUrl: ''
        };

        // Call agent to generate code
        const codeResult = await agent.code(context, payload.plan);

        console.log(`[CodingWorker] Code generated for job ${aicdJob.jobId}`);

        // Transition to REVIEWING state
        await stateMachine.transition(aicdJob.jobId, JobEvent.CODE_SUCCEEDED);

        // Add to reviewing queue
        const reviewingQueue = getReviewingQueue();
        await reviewingQueue.add(
          `job-${aicdJob.jobId}`,
          {
            ...aicdJob,
            payload: {
              type: 'reviewing',
              plan: payload.plan,
              code: codeResult
            }
          },
          { jobId: aicdJob.jobId }
        );

        console.log(`[CodingWorker] Job ${aicdJob.jobId} moved to reviewing queue`);

        return { success: true, codeResult };
      } catch (error) {
        console.error(`[CodingWorker] Error processing job ${aicdJob.jobId}:`, error);

        // Transition to FAILED state
        await stateMachine.transition(
          aicdJob.jobId,
          JobEvent.CODE_FAILED,
          error instanceof Error ? error.message : String(error)
        );

        throw error;
      }
    },
    getDefaultWorkerOptions()
  );
}
