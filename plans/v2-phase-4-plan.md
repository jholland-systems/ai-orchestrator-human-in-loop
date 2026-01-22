# Phase 4: The Proprietary Intelligence 🧠 (Private) - Detailed Plan

**Focus**: This is the "secret sauce" phase where the actual AI logic, driven by large language models (LLMs), is implemented. It leverages the `IAgent` interface defined in Phase 3, keeping the core Orchestrator decoupled. The primary goal is to port existing prompt engineering, integrate with real LLM APIs, and establish a robust feedback loop for AI-driven self-correction. This entire phase will be developed and contained within the `/packages/proprietary-ai` directory, which is excluded from the public repository via `.gitignore`.

## Tasks

### 1. Implement the real `OpenAIAgent` / `ClaudeAgent` classes inside the private package

This task involves creating concrete implementations of the `IAgent` interface using real LLM APIs (e.g., OpenAI, Anthropic) to provide the actual intelligence for the platform.

*   **1.1 Install LLM SDKs**:
    *   **Location**: Within `/packages/proprietary-ai/`.
    *   **Action**: Install the necessary client libraries/SDKs (e.g., `openai`, `anthropic`, along with their respective TypeScript type definitions like `@types/openai` if available) as local dependencies in the `proprietary-ai` package.
*   **1.2 Implement `OpenAIAgent` / `ClaudeAgent`**:
    *   **Location**: Create files like `packages/proprietary-ai/src/agents/OpenAIAgent.ts` and `packages/proprietary-ai/src/agents/ClaudeAgent.ts`.
    *   **Action**: For each target LLM, create a class that implements the `IAgent` interface (defined in `/packages/core/src/agents/IAgent.ts`).
    *   **API Integration**: Each method (`plan`, `code`, `review`) will make actual asynchronous API calls to the respective LLM provider (OpenAI, Anthropic).
    *   **Configuration**: Ensure that LLM API keys, chosen model names (e.g., `gpt-4o`, `claude-3-opus`), and other LLM-specific parameters (e.g., `temperature`, `max_tokens`) are configured securely via environment variables (accessed from `process.env` within the worker process).
    *   **Error Handling**: Implement robust error handling for LLM API calls, including network errors, rate limiting, authentication failures, and LLM-specific response errors. Implement retry mechanisms with exponential backoff for transient issues.
*   **1.3 Agent Selection Mechanism**:
    *   **Location**: Within `/packages/proprietary-ai/src/agents/agent-factory.ts` (or similar).
    *   **Action**: Create a factory function or a dependency injection configuration that, based on environment variables (e.g., `process.env.ACTIVE_LLM_PROVIDER`), returns the appropriate concrete `IAgent` instance (`OpenAIAgent`, `ClaudeAgent`). This factory will be used by the Orchestrator's workers to get the live AI agent. It should also be capable of returning the `MockAgent` (from Phase 3) for specific testing or local development scenarios.

### 2. Port your prompt engineering from v1

This task involves translating and adapting the existing prompt engineering strategies from the previous version of AI-CD for the new `IAgent` implementations and structured workflow.

*   **2.1 Review V1 Prompts**:
    *   **Reference**: Access the prompt engineering artifacts (e.g., text files, code snippets containing prompts) from the `ai-cd` directory (one level up). This includes prompts specifically designed for planning, coding, and review steps.
    *   **Analysis**: Critically analyze the structure, desired output formats (e.g., JSON schema for plans), instructions, few-shot examples, and any specific constraints of the existing prompts.
*   **2.2 Adapt Prompts for `IAgent` Methods**:
    *   **Location**: Prompts will reside within `/packages/proprietary-ai/src/prompts/`.
    *   **Action**: For each `IAgent` method (`plan`, `code`, `review`), adapt the v1 prompts to fit the new `jobContext` inputs and `PlanResult`/`CodeResult`/`ReviewResult` output interfaces defined in `/packages/core`.
    *   **Action**: Refactor prompts to be highly modular and parameterizable. Utilize template literals or a dedicated templating library to dynamically inject `jobContext` variables (e.g., issue description, relevant file contents, previous code snippets, existing test failures).
    *   **Output Parsing & Validation**: Implement robust JSON parsing and schema validation (e.g., using Zod) for LLM responses, especially for structured outputs like plans and code modifications. Handle cases where the LLM fails to provide valid JSON.
*   **2.3 Context Management**:
    *   **Action**: Implement strategies for managing context window limitations of LLMs, which is crucial for complex tasks and large codebases. This might involve:
        *   **Summarization**: Automatically summarizing large inputs (e.g., Git diffs, extensive file contents, long issue descriptions) before feeding them to the LLM.
        *   **Token Counting**: Implementing token counting mechanisms to ensure prompts fit within the LLM's context window.
        *   **Focused Input**: Strategically selecting and providing only the most relevant code snippets or documentation based on the task, rather than entire files.

### 3. Implement the "Feedback Loop" (Reviewer rejects → Coder retries)

This task creates a crucial self-correction mechanism within the AI workflow, allowing the AI to refine its work based on internal review feedback, mimicking a human developer's iterative process.

*   **3.1 Define Review Feedback Structure**:
    *   **Location**: In `/packages/core/src/state-machine/types.ts` (or `/packages/proprietary-ai/src/feedback/types.ts`).
    *   **Action**: Enhance the `ReviewResult` structure to include not only a pass/fail flag but also detailed, actionable feedback points.
    *   **Example**: `feedback: { filePath: string, lineNumber?: number, comment: string, severity: 'error' | 'warning' }[]`.
*   **3.2 Integrate Review into State Machine Flow**:
    *   **Action**: Modify the Orchestrator's state transition logic (defined in Phase 3, e.g., `JobStateMachine.ts`) to handle a `review_rejected` event.
    *   **Action**: When `review_rejected` occurs, the state machine should transition the job *back* to the `CODING` state (or a more specific `REFINING` state). The `Job` payload in the database should be updated to store the detailed feedback from the `ReviewResult`.
*   **3.3 Coder Agent's Response to Feedback**:
    *   **Location**: Within the `code` method of `OpenAIAgent`/`ClaudeAgent` (`packages/proprietary-ai/`).
    *   **Action**: If the incoming `jobContext` for a `code` task indicates that it's a retry attempt (i.e., it includes previous `ReviewResult` feedback), the `code` prompt generation logic should dynamically incorporate this feedback.
    *   **Action**: The prompt should explicitly instruct the LLM to address the specific feedback points provided and generate revised code or approach the problem differently.
*   **3.4 Safety Layer Integration**:
    *   **Action**: Ensure that the "Safety Layer" (Policy Engine from v1, referenced in the high-level plan) is integrated into the `review` process. Before any `CodeResult` is accepted as valid or moves towards PR creation, the LLM's `ReviewResult` (and potentially the generated code itself) *must* be checked by the Safety Layer. This prevents the AI from pushing unsafe or undesirable code.

## Gate

✅ "VCR" (Recorded) tests of LLM interactions to ensure stable outputs without burning tokens during CI. This ensures the proprietary logic is consistent and avoids unnecessary LLM costs.

*   **VCR Setup**:
    *   **Action**: Integrate a "VCR" (or "cassette") testing library (e.g., `nock` for mocking HTTP requests, or a more specialized LLM playback library) within `/packages/proprietary-ai/tests/`.
    *   **Mechanism**: This library will record actual LLM API calls and their responses during initial, authorized test runs, then play them back during subsequent CI runs, effectively "freezing" the LLM's behavior.
*   **Test Cases**:
    *   **Location**: Create integration tests within `/packages/proprietary-ai/tests/` that directly invoke each `IAgent` method (`plan`, `code`, `review`) with realistic, diverse `jobContext` inputs.
    *   **Verification**: Assert that the `IAgent` methods return the expected structured results based on the recorded responses in the VCR cassettes.
    *   **Feedback Loop Test**: Specifically, a test should:
        1.  Invoke the `code` method for an initial attempt with a given `jobContext`.
        2.  Simulate a `review_rejected` event with specific, structured feedback.
        3.  Invoke the `code` method *again*, passing in the original `jobContext` *plus* the generated feedback, and verify that the LLM's recorded response (from the VCR) reflects an attempt to address that feedback (e.g., changes in the output or a different response structure).
*   **CI Enforcement**: Ensure that the CI pipeline configuration enforces that no actual LLM API calls are made when running tests for `proprietary-ai`. All tests must run against the recorded VCR cassettes to prevent token burning and ensure deterministic results.