# Phase 5: GitHub Integration & Billing 💰 - Detailed Plan

**Focus**: This phase transforms the core AI Orchestrator into a complete, monetizable product by integrating with essential external platforms. It involves setting up robust GitHub integration for orchestrating code changes and Pull Requests, as well as implementing a metered billing system using Stripe for monetization.

## Tasks

### 1. Octokit integration for real PRs

This task involves integrating with GitHub's API to perform necessary Git operations and create Pull Requests based on the AI's output, allowing the AI to deliver its work directly into user repositories.

*   **1.1 Install Octokit**:
    *   **Location**: Primarily within `/packages/github-worker/`.
    *   **Action**: Install the `@octokit/rest` library (or specific Octokit plugins as needed) and its TypeScript type definitions (`@types/octokit__rest`).
*   **1.2 GitHub App Setup & Authentication**:
    *   **Action**: Create and configure a **GitHub App** (preferred for production) or set up OAuth authentication. This provides fine-grained permissions and allows installation across multiple user repositories.
    *   **Configuration**: Securely store GitHub App credentials (e.g., `APP_ID`, `PRIVATE_KEY`) as environment variables. Implement logic to generate and refresh short-lived installation access tokens using these credentials.
*   **1.3 Implement GitHub Operations Service**:
    *   **Location**: In `/packages/github-worker/src/services/GitHubService.ts`.
    *   **Action**: Create a service that encapsulates all interactions with the GitHub API using an authenticated Octokit client. This service should act as a wrapper around Octokit methods.
    *   **Key Methods to Implement**:
        *   `fetchRepositoryDetails(owner: string, repo: string)`: Get basic repo info.
        *   `createBranch(owner: string, repo: string, baseBranch: string, newBranch: string)`: Create a new branch for the AI's work.
        *   `getFileContent(owner: string, repo: string, path: string, ref: string)`: Retrieve content of a specific file.
        *   `updateFile(owner: string, repo: string, path: string, content: string, message: string, branch: string, sha?: string)`: Update an existing file.
        *   `createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string)`: Create a new file.
        *   `deleteFile(owner: string, repo: string, path: string, message: string, branch: string, sha: string)`: Delete a file.
        *   `createPullRequest(owner: string, repo: string, head: string, base: string, title: string, body: string)`: **Crucially**, create a Pull Request with AI-generated content (title, description, changes).
        *   `addCommentToPullRequest(owner: string, repo: string, pullNumber: number, comment: string)`: For AI feedback or status updates.
*   **1.4 Integrate with Orchestrator (PR Creation)**:
    *   **Action**: Modify the Orchestrator's state machine (from Phase 3) to include a new state: `PR_CREATION_INITIATED` and `PR_OPENED`.
    *   **Action**: When the AI completes its coding and review cycle (e.g., job reaches a `REVIEW_APPROVED` or similar state), the Orchestrator should trigger a BullMQ job (perhaps `prCreationQueue`) that invokes the `GitHubService` to create a Pull Request.
    *   **Data Flow**: The `Job` record in the database should store the necessary information for PR creation (e.g., target repository, proposed changes from AI, AI-generated PR title/description) and, upon success, the resulting PR URL and number.
*   **1.5 Implement GitHub Webhook Handler**:
    *   **Location**: In `/apps/backend/src/routes/github-webhooks.ts`. This service will likely be the primary entry point for new AI-CD jobs.
    *   **Action**: Implement a Fastify route (`POST /github/webhook`) to securely receive GitHub Webhooks (e.g., `issues.opened`, `pull_request.opened`, `pull_request.closed`, `issue_comment.created`).
    *   **Verification**: Implement robust security checks:
        *   Verify the webhook signature using the shared secret to ensure authenticity.
        *   Handle event idempotency to prevent duplicate processing.
    *   **Action**: Parse relevant webhook events (e.g., a new issue being opened, a comment being added to an issue/PR, a PR being merged) and enqueue new `AicdJob`s into the `QUEUED` state, passing all necessary context (repository details, issue/PR payload, event type) to the Orchestrator.

### 2. Stripe Webhook handling (Metered billing: charge per PR or per Token)

This task focuses on setting up a robust and flexible billing system using Stripe, essential for monetizing the AI Developer Platform.

*   **2.1 Install Stripe SDK**:
    *   **Location**: Primarily within `/apps/backend/` (or a dedicated `packages/billing` if a separate service is planned).
    *   **Action**: Install the `stripe` Node.js SDK and its TypeScript types.
*   **2.2 Stripe Product & Pricing Model Definition**:
    *   **Action**: In the Stripe Dashboard, define the product(s) (e.g., "AI-CD Service").
    *   **Action**: Determine the metered billing strategy:
        *   **Per Pull Request**: Charge a fixed or tiered amount for each PR successfully opened by the AI. Simpler to implement initially.
        *   **Per Token Usage**: Track input and output LLM token usage (from Phase 4) and charge based on a token-based tier. More granular but requires more complex usage reporting.
        *   **Hybrid**: A combination (e.g., base subscription + metered PRs/tokens).
    *   **Action**: Create corresponding recurring pricing plans with metering enabled in Stripe.
*   **2.3 Implement Billing Service**:
    *   **Location**: In `/apps/backend/src/services/BillingService.ts`.
    *   **Action**: Create a service that encapsulates all interactions with the Stripe API for customer and subscription management.
    *   **Key Methods to Implement**:
        *   `createCustomer(userDetails: CustomerDetails)`: Create a new Stripe customer.
        *   `createSubscription(customerId: string, priceId: string)`: Subscribe a customer to a plan.
        *   `recordUsage(subscriptionItemId: string, quantity: number, timestamp: number)`: **Crucially**, report metered usage to Stripe.
        *   `handlePaymentSuccess(invoiceId: string)`: Update internal records on successful payment.
        *   `handlePaymentFailure(invoiceId: string)`: Handle failed payments (e.g., notify user, downgrade access).
*   **2.4 Integrate Usage Tracking with Orchestrator/Agents**:
    *   **Action**: Modify the Orchestrator's state transition logic (Phase 3) and/or the `IAgent` implementations (Phase 4) to report usage metrics to the `BillingService` at appropriate points.
        *   For a "Per PR" model: Call `BillingService.recordUsage()` after a Pull Request is successfully opened by the `GitHubService`.
        *   For a "Per Token" model: LLM client wrappers within the `IAgent` (from Phase 4) should track token usage (input/output) for each LLM call and periodically aggregate and report this to the `BillingService`.
*   **2.5 Implement Stripe Webhook Handler**:
    *   **Location**: In `/apps/backend/src/routes/stripe-webhooks.ts`.
    *   **Action**: Implement a dedicated Fastify route (`POST /stripe/webhook`) to securely receive Stripe Webhooks.
    *   **Verification**: Verify webhook payloads using the `Stripe-Signature` header to ensure they are genuinely from Stripe. Handle event idempotency.
    *   **Action**: Process critical Stripe events such as `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`. These events will trigger updates to internal user/subscription statuses in the database and potentially send user notifications or adjust platform access.
*   **2.6 Webhook Durability (Raw Event Logging)**:
    *   **Action**: Implement a "Raw Event Log" table in the database (e.g., `webhook_events` schema in `/packages/core/src/db/schema/`). This table will store the full raw payload of *every* incoming webhook (both GitHub and Stripe), along with metadata like `source` (GitHub/Stripe), `eventType`, `receivedAt`, and `processedAt` (null initially).
    *   **Action**: Modify *both* GitHub and Stripe webhook handlers to strictly perform an `INSERT` of the raw webhook payload into this `webhook_events` table *immediately* upon receipt, and then return a `200 OK` response to the webhook provider. This decouples event reception from event processing.
    *   **Action**: Create separate BullMQ workers (e.g., `webhookProcessingQueue`) that read from this `webhook_events` table (where `processedAt` is null) and asynchronously process the actual business logic for each webhook.
    *   **Benefit**: This Outbox Pattern guarantees "at-least-once" delivery and processing. Even if the application crashes during processing, the raw event is safely stored and can be reprocessed later, ensuring 100% durability of critical billing and GitHub events.

## Gate

✅ End-to-End test simulating a GitHub Webhook triggering the entire pipeline. This comprehensive test validates the complete product workflow, from external event ingestion to AI processing, GitHub interaction, and usage recording for billing.

*   **Test Scenario Setup**:
    *   The test environment includes mocked external dependencies:
        *   A mocked GitHub API (e.g., using `nock` or a dedicated test fixture that simulates webhook payloads and Octokit responses).
        *   A mocked Stripe API (e.g., `nock` or a test double for the `stripe` SDK).
    *   A test "user" is provisioned in the database with a mocked Stripe subscription ID.
*   **Simulated Flow**:
    1.  A simulated GitHub Webhook event (e.g., `issues.opened` for a specific repository) is sent to the application's `/github/webhook` endpoint.
    2.  The application's webhook handler processes the event, creates a new `AicdJob` in the database, and enqueues it to the `planningQueue`.
    3.  The Orchestrator workers (running with the `MockAgent` from Phase 3 for AI logic) pick up the job and successfully process it through all relevant states (`QUEUED` -> `PLANNING` -> `CODING` -> `REVIEWING` -> `PR_CREATION_INITIATED`).
    4.  The `GitHubService` is invoked to simulate the creation of a Pull Request (mocked Octokit call).
    5.  Upon successful PR creation (simulated), the `BillingService` is invoked to record usage for the test user's subscription (mocked Stripe call for metered usage).
*   **Verification**:
    *   The database `Job` record is correctly updated to reflect the `PR_OPENED` state, including the simulated PR URL and number.
    *   The mocked `GitHubService` confirms it received a call to `createPullRequest` with the expected title, body, and head/base branches.
    *   The mocked `BillingService` confirms it received a call to `recordUsage` for the correct `subscriptionItemId` and `quantity`.
    *   No unhandled errors or unexpected behavior occur throughout the entire end-to-end process.
This gate signifies that the core value proposition of the platform (AI creating PRs, and billing for it) is functionally integrated and testable.