/**
 * Job State Machine - State Definitions
 *
 * Defines the possible states a job can be in during its lifecycle.
 */

export enum JobState {
  QUEUED = 'QUEUED',
  PLANNING = 'PLANNING',
  CODING = 'CODING',
  REVIEWING = 'REVIEWING',
  PR_OPEN = 'PR_OPEN',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

/**
 * Job events that trigger state transitions
 */
export enum JobEvent {
  START_PLANNING = 'START_PLANNING',
  PLAN_SUCCEEDED = 'PLAN_SUCCEEDED',
  PLAN_FAILED = 'PLAN_FAILED',

  START_CODING = 'START_CODING',
  CODE_SUCCEEDED = 'CODE_SUCCEEDED',
  CODE_FAILED = 'CODE_FAILED',

  START_REVIEWING = 'START_REVIEWING',
  REVIEW_APPROVED = 'REVIEW_APPROVED',
  REVIEW_REJECTED = 'REVIEW_REJECTED',
  REVIEW_FAILED = 'REVIEW_FAILED',

  PR_OPENED = 'PR_OPENED',
  PR_FAILED = 'PR_FAILED',

  MARK_COMPLETED = 'MARK_COMPLETED',
  CANCEL = 'CANCEL',
  FAIL = 'FAIL'
}

/**
 * Valid state transitions
 * Map of current state to allowed next states
 */
export const VALID_TRANSITIONS: Record<JobState, JobState[]> = {
  [JobState.QUEUED]: [JobState.PLANNING, JobState.CANCELLED, JobState.FAILED],
  [JobState.PLANNING]: [JobState.CODING, JobState.FAILED, JobState.CANCELLED],
  [JobState.CODING]: [JobState.REVIEWING, JobState.FAILED, JobState.CANCELLED],
  [JobState.REVIEWING]: [
    JobState.CODING, // Review rejected, retry coding
    JobState.PR_OPEN,
    JobState.FAILED,
    JobState.CANCELLED
  ],
  [JobState.PR_OPEN]: [JobState.COMPLETED, JobState.FAILED],
  [JobState.COMPLETED]: [], // Terminal state
  [JobState.FAILED]: [], // Terminal state
  [JobState.CANCELLED]: [] // Terminal state
};

/**
 * Check if a state transition is valid
 */
export function isValidTransition(from: JobState, to: JobState): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Get the next state for a given event in the current state
 */
export function getNextState(currentState: JobState, event: JobEvent): JobState | null {
  const transitions: Record<JobState, Partial<Record<JobEvent, JobState>>> = {
    [JobState.QUEUED]: {
      [JobEvent.START_PLANNING]: JobState.PLANNING,
      [JobEvent.CANCEL]: JobState.CANCELLED,
      [JobEvent.FAIL]: JobState.FAILED
    },
    [JobState.PLANNING]: {
      [JobEvent.PLAN_SUCCEEDED]: JobState.CODING,
      [JobEvent.PLAN_FAILED]: JobState.FAILED,
      [JobEvent.CANCEL]: JobState.CANCELLED
    },
    [JobState.CODING]: {
      [JobEvent.CODE_SUCCEEDED]: JobState.REVIEWING,
      [JobEvent.CODE_FAILED]: JobState.FAILED,
      [JobEvent.CANCEL]: JobState.CANCELLED
    },
    [JobState.REVIEWING]: {
      [JobEvent.REVIEW_APPROVED]: JobState.PR_OPEN,
      [JobEvent.REVIEW_REJECTED]: JobState.CODING, // Retry coding
      [JobEvent.REVIEW_FAILED]: JobState.FAILED,
      [JobEvent.CANCEL]: JobState.CANCELLED
    },
    [JobState.PR_OPEN]: {
      [JobEvent.PR_OPENED]: JobState.COMPLETED,
      [JobEvent.PR_FAILED]: JobState.FAILED
    },
    [JobState.COMPLETED]: {},
    [JobState.FAILED]: {},
    [JobState.CANCELLED]: {}
  };

  return transitions[currentState][event] ?? null;
}
