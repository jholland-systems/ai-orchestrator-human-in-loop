# Phase 1: The "Professional" Skeleton 🛡️ - Detailed Plan

**Focus**: Establishing the foundational tooling, Continuous Integration/Continuous Deployment (CI/CD) pipeline, and a robust test harness. This phase sets up the development environment and ensures that the core components for testing and dependency management are in place before diving into application logic.

## Tasks

### 1. Setup Monorepo & TS Config

This task focuses on initializing the project's structure, tooling, and basic configurations to support the monorepo strategy and TypeScript development.

*   **1.1 Choose Monorepo Tool**:
    *   **Decision**: Utilize **Turborepo** for its build system, caching, and task orchestration capabilities, which are beneficial for monorepos with multiple interdependent packages.
    *   **Action**: Initialize the monorepo at the project root (`ai-cd-v2`) using Turborepo's setup guide.
*   **1.2 Structure Creation**:
    *   **Action**: Create the basic directory structure as outlined in the high-level plan. For each application (`/apps`) and package (`/packages`), create its respective folder.
        *   `/apps/backend`
        *   `/packages/core`
        *   `/packages/github-worker`
        *   `/packages/proprietary-ai`
        *   `/docker`
        *   `/tests`
*   **1.3 TypeScript Configuration**:
    *   **Action**: Establish a base `tsconfig.json` in the monorepo root. This configuration should enable strict mode and define common compiler options suitable for a Node.js/TypeScript project (e.g., `target`, `module`, `esModuleInterop`, `forceConsistentCasingInFileNames`).
    *   **Action**: For each app/package, create a `tsconfig.json` file that `extends` the root configuration. Configure specific options for each (e.g., `outDir`, `rootDir`, `composite: true` for build dependencies).
    *   **Action**: Ensure proper path mapping (`paths` in `tsconfig.json`) and module resolution (`baseUrl`) to allow seamless imports between monorepo packages.
*   **1.4 Git Initialization & `.gitignore`**:
    *   **Action**: Initialize a Git repository in the monorepo root.
    *   **Action**: Create a comprehensive `.gitignore` file at the root.
    *   **Crucially**: Add `/packages/proprietary-ai` to the `.gitignore` to fulfill the "open core" strategy of hiding proprietary code while keeping the structure visible.
    *   **Action**: Include standard ignores like `node_modules/`, `dist/`, `.env`, build artifacts, and OS-specific temporary files.
*   **1.5 Initial `package.json` Setup**:
    *   **Action**: Create a `package.json` file in the monorepo root, configuring it to use Turborepo workspaces (or NPM Workspaces if Turborepo is not chosen).
    *   **Action**: Define common scripts (e.g., `build`, `test`, `lint`, `dev`) in the root `package.json` that can run commands across packages using Turborepo's filters.
    *   **Action**: Create minimal `package.json` files within each app/package, including `name`, `version`, and `dependencies`.
*   **1.6 Architectural Linting**:
    *   **Action**: Install `dependency-cruiser` (or configure `eslint-plugin-boundaries`) in the monorepo.
    *   **Configuration**: Configure rules to strictly forbid imports from `/packages/proprietary-ai` into `/packages/core` or `/packages/github-worker`. This enforces the "Brain/Body" split at the linter level, making accidental leakage impossible without a build failure.
*   **1.7 Dynamic Workspace Script**:
    *   **Action**: Create a `preinstall` script (or a dedicated setup script runnable by `turbo gen` or similar) that executes before `npm install` or `pnpm install` in the monorepo root.
    *   **Logic**: This script will check for the existence of the `/packages/proprietary-ai` folder.
    *   **If missing (e.g., public CI, open-source contributor)**: It will dynamically generate a "Stub" package in that location (e.g., a minimal `package.json` and `index.ts` with no-op exports) or modify the root `package.json`'s `workspaces` list to temporarily exclude `/packages/proprietary-ai`.
    *   **Benefit**: This ensures the public repository remains buildable and testable by contributors without them needing the private code, preventing build failures due to missing proprietary dependencies.

### 2. Setup Testcontainers for Postgres & Redis

This task ensures that integration tests can run against isolated, real database and caching instances using Docker containers.

*   **2.1 Install Testcontainers**:
    *   **Action**: Install the Testcontainers library for Node.js (`testcontainers`).
*   **2.2 Docker Daemon Requirement**:
    *   **Documentation**: Document that a running Docker daemon is a prerequisite for local development and CI environments to utilize Testcontainers.
*   **2.3 Postgres Container Setup**:
    *   **Action**: Develop a utility function or class (e.g., in `/tests/utils/test-db.ts`) to programmatically start and stop a PostgreSQL Docker container using Testcontainers.
    *   **Configuration**: Configure standard connection details (port mapping, environment variables for user, password, database name) that tests can use.
    *   **Verification**: Ensure the setup waits for the database to be fully ready before returning connection information.
*   **2.4 Redis Container Setup**:
    *   **Action**: Develop a similar utility function or class (e.g., in `/tests/utils/test-redis.ts`) to manage a Redis Docker container using Testcontainers.
    *   **Configuration**: Configure connection details (port mapping).
    *   **Verification**: Ensure the setup waits for Redis to be ready.
*   **2.5 Centralized Test Utilities**:
    *   **Action**: Create a common test setup module (e.g., `/tests/setup.ts`) that orchestrates the starting and stopping of both Postgres and Redis containers for the entire test suite. This module will be imported and used by the testing framework's `setupFilesAfterEnv` option.

### 3. Create a "Hello World" flow where a test spins up a real DB, inserts a job, and verifies it exists

This task validates the entire foundational setup by implementing a minimal end-to-end integration test.

*   **3.1 Define "Job" Schema (Placeholder)**:
    *   **Location**: Inside `/packages/core`, define a minimal Drizzle ORM schema for a `Job` entity. This schema should include at least `id` (primary key), `status` (e.g., `text` or `enum`), and `createdAt` (e.g., `timestamp`). This represents the simplest possible unit of work for the Orchestrator.
*   **3.2 Drizzle Migration Setup (Initial)**:
    *   **Action**: Configure Drizzle Kit within `/packages/core` to manage database migrations.
    *   **Action**: Create the initial Drizzle migration file that generates the SQL to create the `jobs` table based on the defined schema.
    *   **Action**: Implement a script or utility to apply this migration to a target PostgreSQL database.
*   **3.3 Database Client Initialization**:
    *   **Location**: Within `/packages/core`, create a Drizzle ORM client instance. This client will be configured dynamically in tests to connect to the Testcontainers PostgreSQL instance. In production, it will connect to the actual PostgreSQL database.
*   **3.4 Integration Test Development (`/tests` directory)**:
    *   **Action**: Create a new integration test file (e.g., `tests/hello-world.test.ts`).
    *   **Test Suite Setup (`beforeAll`, `beforeEach`, `afterAll`)**:
        *   **`beforeAll`**: Use the centralized test utilities (from Task 2.5) to spin up a fresh PostgreSQL container. Connect the Drizzle client to this container. Apply the initial Drizzle migration.
        *   **`beforeEach`**: Implement logic to clear the `jobs` table before each test case to ensure test isolation and prevent side effects.
        *   **`afterAll`**: Tear down the PostgreSQL container to free up resources.
    *   **Test Case**:
        *   **Action**: Write a test case that:
            1.  Uses the Drizzle client to insert a new `Job` record with an initial status (e.g., `status: 'QUEUED'`).
            2.  Queries the database using the Drizzle client to retrieve the newly inserted job.
            3.  Asserts that the retrieved job exists and its `id` and `status` match the expected values.
*   **3.5 CI/CD Integration (Basic `npm test`)**:
    *   **Action**: Ensure that the root `package.json` `test` script is configured to execute this integration test using **Vitest**.
    *   **Verification**: Confirm that running `npm test` from the monorepo root successfully triggers Testcontainers, starts the Docker container, runs the test, and cleans up without errors.

## Gate

✅ `npm test` passes with a real Dockerized database. This includes:
*   Successful initialization and teardown of the PostgreSQL container via Testcontainers.
*   Successful application of Drizzle migrations to the test database.
*   Successful insertion and retrieval of data via Drizzle ORM.
*   All test assertions passing for the "Hello World" job flow.
*   No unexpected errors or resource leaks during the test run.
This gate validates the foundational setup of the monorepo, TypeScript, testing harness, and initial database integration, providing a stable base for subsequent phases.