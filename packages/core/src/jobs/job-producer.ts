/**
 * Job Producer
 *
 * Functions for creating and submitting jobs to queues.
 */

import { getPlanningQueue } from '../queues/queues.js';
import { JobState } from '../state-machine/job-states.js';
import type { AicdJob, QueuedPayload } from './types.js';

export interface CreateJobOptions {
  tenantId: string;
  repositoryId: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
}

/**
 * Create and submit a new job to the planning queue
 *
 * @param options - Job creation options
 * @returns Job ID
 */
export async function createJob(options: CreateJobOptions): Promise<string> {
  const jobId = crypto.randomUUID();

  const payload: QueuedPayload = {
    type: 'queued',
    issueTitle: options.issueTitle,
    issueBody: options.issueBody,
    issueUrl: options.issueUrl
  };

  const job: AicdJob = {
    jobId,
    tenantId: options.tenantId,
    repositoryId: options.repositoryId,
    issueNumber: options.issueNumber,
    currentState: JobState.QUEUED,
    payload,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  // Add to planning queue
  const planningQueue = getPlanningQueue();
  await planningQueue.add(`job-${jobId}`, job, {
    jobId // Use our UUID as BullMQ job ID
  });

  return jobId;
}
