/**
 * IAgent Interface - Brain/Body Abstraction
 *
 * Defines the contract for AI agent implementations.
 * This interface allows the orchestrator (Body) to remain decoupled
 * from specific AI implementations (Brain).
 *
 * The orchestrator calls these methods, and different implementations
 * can be swapped (MockAgent for testing, OpenAIAgent/ClaudeAgent for production).
 */

import type { JobContext, PlanResult, CodeResult, ReviewResult } from '../jobs/types';

/**
 * Generic AI agent interface
 */
export interface IAgent {
  /**
   * Planning phase: Analyze the issue and create an implementation plan
   *
   * @param context - Job context including issue details
   * @returns Plan with steps, files to change, and complexity estimate
   */
  plan(context: JobContext): Promise<PlanResult>;

  /**
   * Coding phase: Generate code changes based on the plan
   *
   * @param context - Job context
   * @param plan - The plan from the planning phase
   * @returns Code changes with file modifications and commit message
   */
  code(context: JobContext, plan: PlanResult): Promise<CodeResult>;

  /**
   * Review phase: Review the generated code for quality and security
   *
   * @param context - Job context
   * @param plan - The original plan
   * @param code - The generated code changes
   * @returns Review result with approval status and feedback
   */
  review(context: JobContext, plan: PlanResult, code: CodeResult): Promise<ReviewResult>;
}

/**
 * Type guard to check if an object implements IAgent
 */
export function isAgent(obj: unknown): obj is IAgent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'plan' in obj &&
    typeof (obj as IAgent).plan === 'function' &&
    'code' in obj &&
    typeof (obj as IAgent).code === 'function' &&
    'review' in obj &&
    typeof (obj as IAgent).review === 'function'
  );
}
