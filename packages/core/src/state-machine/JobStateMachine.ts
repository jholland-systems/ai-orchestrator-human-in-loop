/**
 * Job State Machine
 *
 * Manages state transitions for AI-CD jobs.
 * Validates transitions, updates database, and enforces business logic.
 */

import { eq } from 'drizzle-orm';
import type { DbClient } from '../db/index.js';
import { jobs } from '../db/schema/index.js';
import { JobState, JobEvent, isValidTransition, getNextState } from './job-states.js';

export class JobStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JobStateError';
  }
}

/**
 * State machine for managing job state transitions
 */
export class JobStateMachine {
  constructor(private db: DbClient) {}

  /**
   * Transition a job to a new state
   *
   * @param jobId - Job identifier
   * @param event - Event triggering the transition
   * @param errorDetails - Optional error details (for failures)
   * @returns Updated job status
   */
  async transition(
    jobId: string,
    event: JobEvent,
    errorDetails?: string
  ): Promise<JobState> {
    // Get current job state from database
    const currentJobRecords = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));

    if (currentJobRecords.length === 0) {
      throw new JobStateError(`Job ${jobId} not found`);
    }

    const currentJob = currentJobRecords[0]!;
    const currentState = currentJob.status as JobState;

    // Determine next state based on event
    const nextState = getNextState(currentState, event);

    if (!nextState) {
      throw new JobStateError(
        `Invalid event ${event} for current state ${currentState}`
      );
    }

    // Validate transition
    if (!isValidTransition(currentState, nextState)) {
      throw new JobStateError(
        `Invalid transition from ${currentState} to ${nextState}`
      );
    }

    // Update database
    const updatedJobs = await this.db
      .update(jobs)
      .set({
        status: nextState,
        updatedAt: new Date(),
        ...(errorDetails && {
          metadata: {
            ...(currentJob.metadata as Record<string, unknown>),
            errorDetails,
            failedAt: currentState
          }
        })
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (updatedJobs.length === 0) {
      throw new JobStateError(`Failed to update job ${jobId}`);
    }

    return nextState;
  }

  /**
   * Get current state of a job
   *
   * @param jobId - Job identifier
   * @returns Current job state
   */
  async getCurrentState(jobId: string): Promise<JobState> {
    const jobRecords = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));

    if (jobRecords.length === 0) {
      throw new JobStateError(`Job ${jobId} not found`);
    }

    return jobRecords[0]!.status as JobState;
  }

  /**
   * Check if a job can transition with a given event
   *
   * @param jobId - Job identifier
   * @param event - Event to check
   * @returns True if transition is valid
   */
  async canTransition(jobId: string, event: JobEvent): Promise<boolean> {
    const currentState = await this.getCurrentState(jobId);
    const nextState = getNextState(currentState, event);

    if (!nextState) {
      return false;
    }

    return isValidTransition(currentState, nextState);
  }

  /**
   * Get job history/metadata
   *
   * @param jobId - Job identifier
   * @returns Job record from database
   */
  async getJob(jobId: string) {
    const jobRecords = await this.db
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId));

    if (jobRecords.length === 0) {
      throw new JobStateError(`Job ${jobId} not found`);
    }

    return jobRecords[0]!;
  }
}
