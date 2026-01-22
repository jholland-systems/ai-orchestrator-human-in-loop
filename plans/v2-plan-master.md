# AI-CD v2: High-Level Master Plan

## Overview

**Goal**: Build a production-ready, paid AI Developer Platform

**Core Constraint**: Public Portfolio Visibility vs. Private IP Protection

**Architecture**: Event-Driven Modular Monolith (Node.js/TypeScript)

**Deployment Environment**: Hetzner Linux machines. The frontend is already built and will interact with this backend.

---

## 1. The "Open Core" Repository Strategy

To satisfy both "Portfolio" and "Proprietary" goals, we will structure the project so the **Engine is visible**, but the **Brain is hidden**.

### Monorepo Structure

We will use a Monorepo (using Turborepo or NPM Workspaces) with this structure:

```
/ai-cd-v2
├── /apps
│   └── /backend              # (Private) The deployable API server
├── /packages
│   ├── /core                 # (Public) The Orchestrator, State Machine, DB Schema
│   ├── /github-worker        # (Public) Webhook handling & Git operations
│   └── /proprietary-ai       # (PRIVATE) Your prompts, fine-tuning data, & advanced agent logic
├── /docker                   # Infrastructure (Postgres, Redis, Qdrant)
└── /tests                    # E2E Integration Tests
```

**The Trick**: You publish the repo structure, but add `/packages/proprietary-ai` to `.gitignore`. In your portfolio, you include a "Dummy Agent" implementation so the code builds and tests pass, but the real intelligence lives only on your production server.

## 2. Technology Stack (The "Professional" Choice)

We are moving from **"Make it work"** to **"Make it maintainable."**

### Core Technologies

- **Runtime**: Node.js 20+ (LTS)
- **Language**: TypeScript (Strict Mode enabled)
- **Web Framework**: Fastify (Faster/modern than Express) or NestJS (Opinionated, enforces architecture)
  - **Recommendation**: Fastify for speed + flexibility, utilizing "Clean Architecture" patterns
- **Database ORM**: Drizzle ORM
  - Lightweight, type-safe, and plays perfectly with your Next.js frontend
- **Queue/Job System**: BullMQ (Redis-based)
  - Essential for the "Loop" architecture
- **Testing**: Vitest (Unit) + Testcontainers (Integration)
  - The gold standard: Real DBs in tests, no mocks

## 3. Architecture: The "Brain & Body" Split

We will separate the **Orchestrator (Body)** from the **Agent (Brain)**. This allows you to upgrade the AI without breaking the app.

### A. The "Body" (Public Infrastructure)

- **State Machine**: Tracks the lifecycle of a job
  - `QUEUED → PLANNING → CODING → REVIEWING → PR_OPEN`
- **GitHub Integration**: Handles Webhooks, Authentication, and Git commands
- **Safety Layer**: The Policy Engine (from v1) that prevents the AI from pushing bad code

### B. The "Brain" (Private IP)

- **The "Planner"**: Proprietary prompts that analyze the issue and generate a JSON plan
- **The "Coder"**: The logic that iterates on code generation
- **The "Critic"**: Your self-review prompts

## 4. Implementation Phases (With Testing Gates)

**Critical Rule**: We will not move to the next phase until the tests for the current phase pass.

---

### Phase 1: The "Professional" Skeleton 🛡️

**Focus**: Tooling, CI/CD, and Test Harness

#### Tasks

1. Setup Monorepo & TS Config
2. Setup Testcontainers for Postgres & Redis
3. Create a "Hello World" flow where a test spins up a real DB, inserts a job, and verifies it exists

#### Gate

✅ `npm test` passes with a real Dockerized database

---

### Phase 2: Core Data & Multi-Tenancy 💾

**Focus**: Parity with your existing Next.js Frontend Schema

#### Tasks

1. Port existing SQL schema to Drizzle
2. Implement Row Level Security (RLS) equivalents in the application layer (Tenant Isolation)
3. Build "Organization/Repository" CRUD services

#### Gate

✅ Integration tests proving Tenant A cannot access Tenant B's data

---

### Phase 3: The Orchestrator Engine ⚙️

**Focus**: The State Machine (The "Loop")

#### Tasks

1. Implement BullMQ workers
2. Build the State Transition logic
   - Example: Transition from `PLANNING` to `CODING` only if Plan is valid
3. **Crucial**: This layer interacts with a generic `IAgent` interface, not the real AI

#### Gate

✅ A test where a "Mock Agent" moves a job through all states successfully

---

### Phase 4: The Proprietary Intelligence 🧠 (Private)

**Focus**: The "Secret Sauce"

#### Tasks

1. Implement the real `OpenAIAgent` / `ClaudeAgent` classes inside the private package
2. Port your prompt engineering from v1
3. Implement the "Feedback Loop" (Reviewer rejects → Coder retries)

#### Gate

✅ "VCR" (Recorded) tests of LLM interactions to ensure stable outputs without burning tokens during CI

---

### Phase 5: GitHub Integration & Billing 💰

**Focus**: The "Product" layer

#### Tasks

1. Octokit integration for real PRs
2. Stripe Webhook handling (Metered billing: charge per PR or per Token)

#### Gate

✅ End-to-End test simulating a GitHub Webhook triggering the entire pipeline

---

## 5. Operational & Security Considerations

To ensure the platform is truly production-ready, secure, and maintainable, the following aspects will be explicitly planned and integrated.

### A. Deployment Strategy

*   **Environment**: Deployment targets are Hetzner Linux machines.
*   **Containerization**: All applications (`backend`, `github-worker`) will be containerized using Docker for consistent environments and simplified deployment.
*   **Orchestration**: Initial deployment will involve Docker Compose, with potential for migration to a more robust orchestrator (e.g., Kubernetes) as scale demands.
*   **CI/CD Integration**: Automated build, test, and deployment pipelines will be established.

### B. Authentication & Authorization

*   **External API Authentication**: Implement robust authentication for external API access (e.g., OAuth2 flows for user-facing applications, API Key management for programmatic access).
*   **Session Management**: Secure session management for the integrated frontend.
*   **Role-Based Access Control (RBAC)**: Define and enforce roles and permissions across the application, leveraging existing multi-tenancy logic.

### C. API Documentation

*   **OpenAPI/Swagger**: Generate and maintain comprehensive API documentation using OpenAPI/Swagger specifications for the backend API.
*   **Developer Portal**: Potentially host documentation on a developer portal for easy access and integration guidance.

### D. Error Handling & Observability

*   **Standardized Error Handling**: Implement a consistent, application-wide error handling strategy, including custom error types and standardized response formats.
*   **Structured Logging**: Utilize structured logging (e.g., JSON logs) for all applications, integrated with a log aggregation system.
*   **Metrics & Monitoring**: Instrument applications with metrics (e.g., Prometheus) and set up dashboards (e.g., Grafana) and alerts for key performance indicators and errors.
*   **Distributed Tracing**: Implement distributed tracing to track requests across the modular monolith and identify performance bottlenecks.

### E. General Security Practices

*   **Input Validation**: Implement strict input validation on all API endpoints to prevent common vulnerabilities (e.g., injection attacks).
*   **Dependency Security**: Regularly scan and update third-party dependencies to mitigate known vulnerabilities.
*   **Secure Coding Guidelines**: Adhere to secure coding best practices throughout development.
*   **Web Application Firewall (WAF)**: Consider a WAF for perimeter defense against common web attacks.
*   **Secrets Management**: Securely manage all sensitive credentials and API keys (e.g., using environment variables, dedicated secret management services).

### F. Disaster Recovery & Backup

*   **Data Backups**: Establish automated daily backups for PostgreSQL databases and Redis data stores.
*   **Recovery Procedures**: Document clear, tested procedures for restoring services and data from backups in the event of a catastrophic failure.
*   **High Availability (Future)**: Plan for future high-availability configurations for critical services if required by business continuity.

