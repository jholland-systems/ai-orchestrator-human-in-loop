# Phase 3: The Orchestrator Engine ⚙️ - Detailed Plan

**Focus**: This phase is critical for implementing the core workflow of the AI Developer Platform—the "Orchestrator" or state machine. It involves setting up a robust job queuing system (BullMQ) and defining the logic that governs how jobs (tasks) transition through various states. A key aspect is establishing a generic interface for AI agents, allowing the "Brain" to be swapped without affecting the "Body."

## Tasks

### 1. Implement BullMQ workers

This task involves setting up the job queuing system using BullMQ, which will manage the asynchronous processing of AI-CD jobs. This ensures scalability and resilience for long-running AI tasks.

*   **1.1 Install BullMQ**:
    *   **Action**: Install `bullmq`, `ioredis`, and `@types/bullmq` in the monorepo. Given that job definitions and queues will be shared, installation within `/packages/core` or a new `packages/job-queue` is appropriate. Let's assume `/packages/core` for now.
*   **1.2 Define Job Types**:
    *   **Location**: In `/packages/core/src/jobs/types.ts`, define clear TypeScript interfaces for different job types that the system will process.
    *   **Example**: `AicdJob` interface could contain properties like `jobId: string`, `organizationId: string`, `repositoryId: string`, `issueId: string`, `currentState: JobState`, `payload: any` (specific data for the current state).
*   **1.3 Create BullMQ Queues**:
    *   **Location**: In `/packages/core/src/queues/`.
    *   **Action**: Instantiate BullMQ queues for each distinct processing stage of the AI-CD workflow (e.g., `planningQueue`, `codingQueue`, `reviewingQueue`, `prOpenQueue`).
    *   **Configuration**: Configure each queue with a connection to Redis. For development/testing, this will use the Testcontainers Redis setup (from Phase 1). For production, it will use environment variables for the Redis connection string. Implement robust error handling for Redis connection failures.
*   **1.4 Implement BullMQ Workers**:
    *   **Location**: In `/apps/backend/src/workers/` (or a dedicated `packages/orchestrator-worker` if further decoupling is desired later).
    *   **Action**: For each defined queue, create a corresponding BullMQ worker function or class. A worker's responsibility is to process jobs from its assigned queue.
    *   **Worker Logic**: Workers should:
        *   Receive and validate a `Job` payload.
        *   Call the appropriate service method (which in turn will interact with the `IAgent` interface defined in Task 3.3).
        *   Handle successful processing by updating the job state in the database and potentially adding the job to the next stage's queue.
        *   Implement robust error handling, including logging failures, retries (with configurable back-off strategies), and moving jobs to a 'failed' queue for manual inspection.
*   **1.5 Basic Job Submission**:
    *   **Action**: Create a simple public function (e.g., `packages/core/src/jobs/job-producer.ts`) that allows other parts of the application (e.g., a Fastify endpoint) to add an `AicdJob` to the initial `planningQueue`.

### 2. Build the State Transition logic

This task defines the rules and processes by which an AI-CD job moves through its lifecycle states, forming the core of the Orchestrator's "loop."

*   **2.1 Define Job States**:
    *   **Location**: In `/packages/core/src/state-machine/job-states.ts`.
    *   **Action**: Define a TypeScript `enum` or `type` for the comprehensive set of job states: `QUEUED`, `PLANNING`, `CODING`, `REVIEWING`, `PR_OPEN`, `COMPLETED`, `FAILED`, `CANCELLED`, etc. These must align with the high-level plan.
*   **2.2 Implement State Machine Core**:
    *   **Action**: Design and implement the core state machine logic. This can be a dedicated service (e.g., `packages/core/src/state-machine/JobStateMachine.ts`) with methods like `transition(job: AicdJob, event: JobEvent, payload?: any): Promise<AicdJob>`.
    *   **Functionality**: The state machine should:
        *   Validate allowed state transitions (e.g., `PLANNING -> CODING` is valid, but `CODING -> QUEUED` is not).
        *   Execute specific actions associated with entering a new state (e.g., `onEnterPlanningState`, which might involve adding the job to `planningQueue`).
        *   Handle various `JobEvent` types (e.g., `PLAN_SUCCEEDED`, `CODE_FAILED`, `REVIEW_REJECTED`) that trigger state changes.
*   **2.3 Update Job Status in Database**:
    *   **Action**: Ensure that every valid state transition updates the `status` field (and potentially other metadata like `lastTransitionedAt`, `errorDetails`) of the corresponding `Job` record in the database (`packages/core/src/db/schema/jobs.ts`). This should be an atomic operation.
    *   **Action**: Integrate logging for all state transitions for robust observability (referencing "D.4 Error Handling & Observability" in the master plan).
*   **2.4 Example Transition Logic**:
    *   **Example**: Implement specific transition rules, such as:
        *   `PLANNING` -> `CODING`: Only if the `plan_succeeded` event is received and the `PlanResult` payload is validated as syntactically correct (e.g., a valid JSON structure).
        *   `PLANNING` -> `FAILED`: If `plan_failed` event is received or a timeout occurs.
        *   `REVIEWING` -> `CODING`: If `review_rejected` event is received (triggering a re-coding loop).

### 3. Crucial: This layer interacts with a generic `IAgent` interface, not the real AI

This task is fundamental to the "Brain & Body" split, ensuring the Orchestrator (Body) remains decoupled from the specific AI implementation (Brain), allowing for future upgrades or alternative AI models.

*   **3.1 Define `IAgent` Interface**:
    *   **Location**: In `/packages/core/src/agents/IAgent.ts`.
    *   **Action**: Define a clear TypeScript interface `IAgent` that specifies the contract for any AI agent implementation.
    *   **Example Methods**:
        *   `plan(jobContext: JobContext): Promise<PlanResult>`
        *   `code(jobContext: JobContext, plan: PlanResult): Promise<CodeResult>`
        *   `review(jobContext: JobContext, code: CodeResult): Promise<ReviewResult>`
    *   **Context**: Ensure that methods receive sufficient context (e.g., `organizationId`, `repositoryId`, `issueDetails`, previous outputs/results) and return structured results (e.g., `PlanResult` could be a JSON object conforming to a schema).
*   **3.2 Implement a `MockAgent`**:
    *   **Location**: In `/packages/core/src/agents/MockAgent.ts`.
    *   **Action**: Create a `MockAgent` class that implements the `IAgent` interface.
    *   **Mock Behavior**: The `MockAgent`'s methods should simulate successful (or controlled failure/delay) responses without calling any actual external LLMs. For instance, `plan` could return a predefined dummy JSON plan after a simulated delay (e.g., using `setTimeout`). This is crucial for testing the Orchestrator without incurring AI costs or external dependencies.
*   **3.3 Integrate `IAgent` with Workers and Services**:
    *   **Action**: The BullMQ workers (from Task 1.4) and the services they call (e.g., `PlanningService`, `CodingService`) will *depend on* and *call* an instance of `IAgent`.
    *   **Dependency Injection**: Implement a lightweight dependency injection pattern (or a simple factory pattern) to provide the correct `IAgent` instance. In development and testing, the `MockAgent` will be injected. In production (Phase 4), the real AI agents will be injected. This pattern significantly enhances testability and maintainability.

## Gate

✅ A test where a "Mock Agent" moves a job through all states successfully. This includes:
*   An integration test that initiates a job in the `QUEUED` state (e.g., by calling the `job-producer` function).
*   The BullMQ workers (running as part of the test environment) successfully pick up the job and execute the state transition logic.
*   The `MockAgent` is effectively used for all AI-related interactions, simulating the responses of real LLMs.
*   The test verifies that the job correctly transitions through `QUEUED`, `PLANNING`, `CODING`, `REVIEWING`, and finally reaches `PR_OPEN` or `COMPLETED` (depending on the mock agent's final action).
*   Each state transition is correctly recorded with its status in the database `Job` record.
*   The test asserts the final state of the job in the database.
*   No unexpected errors, deadlocks, or unhandled exceptions occur during job processing.
*   The system demonstrates resilience to simulated `MockAgent` delays and potential transient failures (if implemented in mock).
This gate validates the complete Orchestrator workflow, the job queuing system, the state machine, and the crucial `IAgent` abstraction.