/**
 * Reviewing Worker
 *
 * Processes jobs in the reviewing queue.
 * Calls the IAgent.review() method to review generated code.
 * If approved, moves to PR open. If rejected, sends back to coding.
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import {
  createDbClient,
  JobEvent,
  JobStateMachine,
  getPrOpenQueue,
  getCodingQueue,
  getDefaultWorkerOptions,
  QUEUE_NAMES
} from '@ai-cd/core';
import type { AicdJob, IAgent, JobContext, ReviewingPayload } from '@ai-cd/core';

/**
 * Create reviewing worker
 *
 * @param agent - AI agent implementation
 * @param dbConnectionString - Database connection string
 * @returns BullMQ worker instance
 */
export function createReviewingWorker(agent: IAgent, dbConnectionString: string) {
  const db = createDbClient(dbConnectionString);
  const stateMachine = new JobStateMachine(db);

  return new Worker<AicdJob>(
    QUEUE_NAMES.REVIEWING,
    async (job: Job<AicdJob>) => {
      const aicdJob = job.data;
      const payload = aicdJob.payload as ReviewingPayload;

      try {
        console.log(`[ReviewingWorker] Processing job ${aicdJob.jobId}`);

        // Note: Job is already in REVIEWING state (transitioned by coding worker)
        // No need to transition again - just proceed with review

        // Build context for agent
        const context: JobContext = {
          jobId: aicdJob.jobId,
          tenantId: aicdJob.tenantId,
          repositoryId: aicdJob.repositoryId,
          issueNumber: aicdJob.issueNumber,
          issueTitle: '',
          issueBody: '',
          issueUrl: ''
        };

        // Call agent to review code
        const reviewResult = await agent.review(context, payload.plan, payload.code);

        console.log(`[ReviewingWorker] Review completed for job ${aicdJob.jobId}: ${reviewResult.approved ? 'approved' : 'rejected'}`);

        if (reviewResult.approved) {
          // Review approved - move to PR open
          await stateMachine.transition(aicdJob.jobId, JobEvent.REVIEW_APPROVED);

          const prOpenQueue = getPrOpenQueue();
          await prOpenQueue.add(
            `job-${aicdJob.jobId}`,
            {
              ...aicdJob,
              payload: {
                type: 'pr_open',
                plan: payload.plan,
                code: payload.code,
                review: reviewResult
              }
            },
            { jobId: aicdJob.jobId }
          );

          console.log(`[ReviewingWorker] Job ${aicdJob.jobId} moved to PR open queue`);
        } else {
          // Review rejected - send back to coding
          await stateMachine.transition(aicdJob.jobId, JobEvent.REVIEW_REJECTED);

          const codingQueue = getCodingQueue();
          await codingQueue.add(
            `job-${aicdJob.jobId}`,
            {
              ...aicdJob,
              payload: {
                type: 'coding',
                plan: payload.plan,
                attempts: (payload.code as any).attempts ? (payload.code as any).attempts + 1 : 1
              }
            },
            { jobId: aicdJob.jobId }
          );

          console.log(`[ReviewingWorker] Job ${aicdJob.jobId} rejected, sent back to coding`);
        }

        return { success: true, reviewResult };
      } catch (error) {
        console.error(`[ReviewingWorker] Error processing job ${aicdJob.jobId}:`, error);

        // Transition to FAILED state
        await stateMachine.transition(
          aicdJob.jobId,
          JobEvent.REVIEW_FAILED,
          error instanceof Error ? error.message : String(error)
        );

        throw error;
      }
    },
    getDefaultWorkerOptions()
  );
}
