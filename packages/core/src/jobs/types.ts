/**
 * Job Types and Interfaces
 *
 * Defines the structure of jobs processed by the orchestrator.
 */

import type { JobState } from '../state-machine/job-states';

/**
 * Core job interface for AI-CD workflow
 */
export interface AicdJob {
  /** Unique job identifier (matches database jobs.id) */
  jobId: string;

  /** Tenant/organization identifier */
  tenantId: string;

  /** Repository identifier */
  repositoryId: string;

  /** GitHub issue number */
  issueNumber: number;

  /** Current state of the job */
  currentState: JobState;

  /** Job payload - state-specific data */
  payload: JobPayload;

  /** Metadata for tracking and debugging */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    attempts?: number;
    errorDetails?: string;
    lastTransitionedAt?: Date;
  };
}

/**
 * Union type for all possible job payloads
 */
export type JobPayload =
  | QueuedPayload
  | PlanningPayload
  | CodingPayload
  | ReviewingPayload
  | PrOpenPayload
  | CompletedPayload
  | FailedPayload;

/**
 * Payload when job is initially queued
 */
export interface QueuedPayload {
  type: 'queued';
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
}

/**
 * Payload during planning phase
 */
export interface PlanningPayload {
  type: 'planning';
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
  plan?: PlanResult;
}

/**
 * Payload during coding phase
 */
export interface CodingPayload {
  type: 'coding';
  plan: PlanResult;
  codeResult?: CodeResult;
  attempts?: number; // Track retry attempts
}

/**
 * Payload during review phase
 */
export interface ReviewingPayload {
  type: 'reviewing';
  plan: PlanResult;
  code: CodeResult;
  reviewResult?: ReviewResult;
}

/**
 * Payload when PR is being opened
 */
export interface PrOpenPayload {
  type: 'pr_open';
  plan: PlanResult;
  code: CodeResult;
  review: ReviewResult;
  prNumber?: number;
  prUrl?: string;
}

/**
 * Payload when job is completed
 */
export interface CompletedPayload {
  type: 'completed';
  prNumber: number;
  prUrl: string;
}

/**
 * Payload when job fails
 */
export interface FailedPayload {
  type: 'failed';
  error: string;
  failedAt: JobState;
}

/**
 * Result from planning agent
 */
export interface PlanResult {
  summary: string;
  steps: string[];
  filesChanged: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  metadata?: Record<string, unknown>;
}

/**
 * Result from coding agent
 */
export interface CodeResult {
  changes: FileChange[];
  commitMessage: string;
  branch: string;
  metadata?: Record<string, unknown>;
}

/**
 * File change from coding agent
 */
export interface FileChange {
  path: string;
  operation: 'create' | 'update' | 'delete';
  content?: string; // For create/update
  originalContent?: string; // For update (for diff)
}

/**
 * Result from review agent
 */
export interface ReviewResult {
  approved: boolean;
  feedback?: string;
  suggestedChanges?: string[];
  securityIssues?: string[];
  qualityScore?: number; // 0-100
  metadata?: Record<string, unknown>;
}

/**
 * Job context passed to agents
 */
export interface JobContext {
  jobId: string;
  tenantId: string;
  repositoryId: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueUrl: string;
}
