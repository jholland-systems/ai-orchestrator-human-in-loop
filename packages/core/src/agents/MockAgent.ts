/**
 * MockAgent - Test Implementation
 *
 * Simulates AI agent behavior without calling real LLMs.
 * Used for testing the orchestrator workflow without API costs.
 */

import type { IAgent } from './IAgent.js';
import type { JobContext, PlanResult, CodeResult, ReviewResult } from '../jobs/types.js';

export interface MockAgentOptions {
  /** Simulate delay (ms) for each operation */
  delayMs?: number;

  /** Force planning to fail */
  failPlanning?: boolean;

  /** Force coding to fail */
  failCoding?: boolean;

  /** Force review to reject (not fail, but reject changes) */
  rejectReview?: boolean;

  /** Force review to fail */
  failReview?: boolean;
}

/**
 * Mock agent that simulates AI responses
 */
export class MockAgent implements IAgent {
  private options: MockAgentOptions;

  constructor(options: MockAgentOptions = {}) {
    this.options = {
      delayMs: 100, // Default 100ms delay
      ...options
    };
  }

  /**
   * Simulate planning phase
   */
  async plan(context: JobContext): Promise<PlanResult> {
    await this.delay();

    if (this.options.failPlanning) {
      throw new Error('MockAgent: Planning failed (simulated)');
    }

    return {
      summary: `Mock plan for issue #${context.issueNumber}: ${context.issueTitle}`,
      steps: [
        'Step 1: Analyze the issue',
        'Step 2: Identify files to modify',
        'Step 3: Implement changes',
        'Step 4: Add tests'
      ],
      filesChanged: ['src/example.ts', 'tests/example.test.ts'],
      estimatedComplexity: 'medium',
      metadata: {
        mockAgent: true,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Simulate coding phase
   */
  async code(context: JobContext, plan: PlanResult): Promise<CodeResult> {
    await this.delay();

    if (this.options.failCoding) {
      throw new Error('MockAgent: Coding failed (simulated)');
    }

    return {
      changes: plan.filesChanged.map(path => ({
        path,
        operation: path.includes('.test.') ? 'create' : 'update',
        content: `// Mock code for ${path}\n// Generated for issue #${context.issueNumber}\n\nexport function mockFunction() {\n  return true;\n}\n`
      })),
      commitMessage: `fix: ${context.issueTitle}\n\n${plan.summary}\n\nResolves #${context.issueNumber}`,
      branch: `fix/issue-${context.issueNumber}`,
      metadata: {
        mockAgent: true,
        timestamp: new Date().toISOString(),
        planSummary: plan.summary
      }
    };
  }

  /**
   * Simulate review phase
   */
  async review(_context: JobContext, _plan: PlanResult, code: CodeResult): Promise<ReviewResult> {
    await this.delay();

    if (this.options.failReview) {
      throw new Error('MockAgent: Review failed (simulated)');
    }

    if (this.options.rejectReview) {
      return {
        approved: false,
        feedback: 'Mock rejection: Code needs improvements',
        suggestedChanges: [
          'Add more error handling',
          'Improve test coverage',
          'Add documentation'
        ],
        securityIssues: [],
        qualityScore: 65,
        metadata: {
          mockAgent: true,
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      approved: true,
      feedback: 'Mock approval: Code looks good!',
      suggestedChanges: [],
      securityIssues: [],
      qualityScore: 95,
      metadata: {
        mockAgent: true,
        timestamp: new Date().toISOString(),
        filesReviewed: code.changes.length
      }
    };
  }

  /**
   * Simulate delay (async operation)
   */
  private delay(): Promise<void> {
    if (!this.options.delayMs) {
      return Promise.resolve();
    }

    return new Promise(resolve => setTimeout(resolve, this.options.delayMs));
  }
}
