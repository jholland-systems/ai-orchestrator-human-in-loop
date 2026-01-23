/**
 * Planning Worker
 *
 * Processes jobs in the planning queue.
 * Calls the IAgent.plan() method to analyze issues and create implementation plans.
 */

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import {
  createDbClient,
  JobEvent,
  JobStateMachine,
  getCodingQueue,
  getDefaultWorkerOptions,
  QUEUE_NAMES
} from '@ai-cd/core';
import type { AicdJob, IAgent, JobContext, PlanningPayload } from '@ai-cd/core';

/**
 * Create planning worker
 *
 * @param agent - AI agent implementation
 * @param dbConnectionString - Database connection string
 * @returns BullMQ worker instance
 */
export function createPlanningWorker(agent: IAgent, dbConnectionString: string) {
  const db = createDbClient(dbConnectionString);
  const stateMachine = new JobStateMachine(db);

  return new Worker<AicdJob>(
    QUEUE_NAMES.PLANNING,
    async (job: Job<AicdJob>) => {
      const aicdJob = job.data;
      const payload = aicdJob.payload as PlanningPayload;

      try {
        console.log(`[PlanningWorker] Processing job ${aicdJob.jobId}`);

        // Transition to PLANNING state
        await stateMachine.transition(aicdJob.jobId, JobEvent.START_PLANNING);

        // Build context for agent
        const context: JobContext = {
          jobId: aicdJob.jobId,
          tenantId: aicdJob.tenantId,
          repositoryId: aicdJob.repositoryId,
          issueNumber: aicdJob.issueNumber,
          issueTitle: payload.issueTitle,
          issueBody: payload.issueBody,
          issueUrl: payload.issueUrl
        };

        // Call agent to create plan
        const planResult = await agent.plan(context);

        console.log(`[PlanningWorker] Plan created for job ${aicdJob.jobId}`);

        // Transition to CODING state
        await stateMachine.transition(aicdJob.jobId, JobEvent.PLAN_SUCCEEDED);

        // Add to coding queue
        const codingQueue = getCodingQueue();
        await codingQueue.add(
          `job-${aicdJob.jobId}`,
          {
            ...aicdJob,
            payload: {
              type: 'coding',
              plan: planResult
            }
          },
          { jobId: aicdJob.jobId }
        );

        console.log(`[PlanningWorker] Job ${aicdJob.jobId} moved to coding queue`);

        return { success: true, planResult };
      } catch (error) {
        console.error(`[PlanningWorker] Error processing job ${aicdJob.jobId}:`, error);

        // Transition to FAILED state
        await stateMachine.transition(
          aicdJob.jobId,
          JobEvent.PLAN_FAILED,
          error instanceof Error ? error.message : String(error)
        );

        throw error; // Let BullMQ handle retries
      }
    },
    getDefaultWorkerOptions()
  );
}
