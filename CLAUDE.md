# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **planning repository** for **AI-CD v2** ("AI Orchestrator Human-in-Loop") - a production-ready, paid AI Developer Platform that autonomously handles GitHub issues by analyzing them, generating code, and creating pull requests for human review.

**Current Status**: Pre-implementation phase. This repository contains comprehensive planning documents but no source code yet. The actual implementation will be built according to the phased plan defined here.

**Target Architecture**: Event-driven modular monolith using Node.js/TypeScript with Fastify/NestJS, BullMQ, PostgreSQL, Redis, and Qdrant.

**Deployment Target**: Hetzner Linux machines

## Repository Structure

```
ai-orchestrator-human-in-loop/
├── README.md                              # Project description
├── LICENSE                                # MIT License
└── plans/                                 # Comprehensive implementation plans
    ├── v2-plan-master.md                  # High-level master plan and architecture
    ├── v2-phase-1-plan.md                 # Phase 1: Professional Skeleton
    ├── v2-phase-2-plan.md                 # Phase 2: Core Data & Multi-Tenancy
    ├── v2-phase-3-plan.md                 # Phase 3: Orchestrator Engine
    ├── v2-phase-4-plan.md                 # Phase 4: Proprietary Intelligence
    ├── v2-phase-5-plan.md                 # Phase 5: GitHub Integration & Billing
    └── v2-operational-security-plan.md    # Security, deployment, observability
```

## Architecture Overview

The planned system follows an "Open Core" strategy where the orchestration engine is public but the AI prompts remain private.

### Planned Monorepo Structure

```
/ai-cd-v2                         # Future implementation location
├── /apps
│   └── /backend                  # (Private) Deployable API server
├── /packages
│   ├── /core                     # (Public) Orchestrator, State Machine, DB Schema
│   ├── /github-worker            # (Public) Webhook handling & Git operations
│   └── /proprietary-ai           # (PRIVATE) Prompts, fine-tuning, agent logic
├── /docker                       # Infrastructure (Postgres, Redis, Qdrant)
└── /tests                        # E2E Integration Tests
```

### Technology Stack

**Runtime & Language**:
- Node.js 20+ (LTS)
- TypeScript (Strict Mode)

**Web Framework**:
- Fastify (speed) or NestJS (opinionated architecture)

**Data Layer**:
- PostgreSQL (primary database)
- Drizzle ORM (type-safe, lightweight)
- Redis via BullMQ (job queue)
- Qdrant (vector embeddings for code search)

**Testing**:
- Vitest (unit tests)
- Testcontainers (integration tests with real databases)

**AI Integration**:
- OpenAI GPT-4 / Anthropic Claude
- Custom prompt engineering (proprietary)

### Core Architecture Pattern: "Brain & Body Split"

**The "Body" (Public Infrastructure)**:
- State Machine: `QUEUED → PLANNING → CODING → REVIEWING → PR_OPEN`
- GitHub Integration: Webhooks, authentication, Git operations
- Safety Layer: Policy engine preventing bad code deployment
- Multi-tenancy: Organization-scoped data isolation

**The "Brain" (Private IP)**:
- Planner Agent: Analyzes issues and generates JSON plans
- Coder Agent: Iterative code generation with context
- Critic Agent: Self-review and quality assurance

**Key Design**: Workers interact with a generic `IAgent` interface, allowing AI implementations to be swapped without changing orchestration logic.

## Implementation Phases

### Phase 1: Professional Skeleton 🛡️
**Status**: Not started
**Focus**: Tooling, CI/CD, Test Harness

**Key Tasks**:
1. Setup Turborepo monorepo with TypeScript strict mode
2. Configure Testcontainers for Postgres & Redis
3. Create "Hello World" integration test with real Dockerized database
4. Implement architectural linting to prevent proprietary package leaks

**Gate**: `npm test` passes with real Dockerized database

### Phase 2: Core Data & Multi-Tenancy 💾
**Status**: Not started
**Focus**: Parity with existing Next.js frontend schema

**Key Tasks**:
1. Port existing SQL schema to Drizzle ORM
2. Implement tenant isolation using AsyncLocalStorage
3. Build Organization/Repository CRUD services with tenant-aware queries

**Gate**: Integration tests proving Tenant A cannot access Tenant B's data

### Phase 3: Orchestrator Engine ⚙️
**Status**: Not started
**Focus**: State Machine and Job Queue

**Key Tasks**:
1. Implement BullMQ workers for each processing stage
2. Build state transition logic with validation
3. Define `IAgent` interface and create `MockAgent` for testing

**Gate**: Test where MockAgent moves a job through all states successfully

### Phase 4: Proprietary Intelligence 🧠
**Status**: Not started
**Focus**: The "Secret Sauce" (Private Package)

**Key Tasks**:
1. Implement real `OpenAIAgent` and `ClaudeAgent` classes
2. Port prompt engineering from v1
3. Implement feedback loop (Reviewer rejects → Coder retries)

**Gate**: VCR tests of LLM interactions ensuring stable outputs

### Phase 5: GitHub Integration & Billing 💰
**Status**: Not started
**Focus**: The "Product" layer

**Key Tasks**:
1. Octokit integration for real PR creation
2. Stripe webhook handling for metered billing

**Gate**: E2E test simulating GitHub webhook triggering full pipeline

## Security & Operational Considerations

The system is designed with production-grade security from the start:

**Authentication & Authorization**:
- OAuth2 for user authentication (frontend integration)
- API Key management for programmatic access
- Role-Based Access Control (RBAC) with organization-level permissions

**Multi-Tenancy**:
- Application-layer tenant isolation using AsyncLocalStorage
- Tenant-aware Drizzle client automatically scoping queries
- Explicit ownership checks for complex relationships

**Observability**:
- Structured logging (Pino/JSON) with log aggregation
- Prometheus metrics + Grafana dashboards
- Distributed tracing via OpenTelemetry
- Standardized error handling with custom error classes

**Deployment**:
- Docker containerization for all services
- Docker Compose orchestration (initial)
- Hetzner Linux VMs with firewall configuration
- Automated CI/CD pipeline for builds and deployments

**Disaster Recovery**:
- Automated daily PostgreSQL backups (pg_dump)
- Redis persistence (RDB/AOF)
- Documented recovery procedures
- Future: High-availability configurations

## Key Design Principles

1. **Test-First Development**: Each phase has a clear "gate" - tests must pass before moving forward

2. **Generic Interfaces**: The orchestrator depends on `IAgent`, not concrete AI implementations, enabling:
   - Testing with MockAgent without API costs
   - Swapping AI providers without refactoring
   - Gradual AI improvements without system changes

3. **Open Core Strategy**:
   - Public: Orchestrator, state machine, GitHub integration
   - Private: Proprietary prompts and agent logic (gitignored)
   - Dummy implementations in public repo ensure buildability

4. **Multi-Tenancy First**: Tenant isolation is baked into the data layer from Phase 2 onward

5. **Observability from Day One**: Logging, metrics, and tracing infrastructure planned from Phase 1

## Reading the Plans

When implementing features, always consult the relevant phase plan:

**For overall architecture**: Start with `plans/v2-plan-master.md`

**For implementation details**: Read the specific phase plan (e.g., `plans/v2-phase-1-plan.md`)

**For security/ops requirements**: Reference `plans/v2-operational-security-plan.md`

Each phase plan includes:
- Detailed task breakdowns with action items
- Clear "Gate" criteria for completion
- Integration with overall system architecture
- Testing requirements

## Related Projects

This backend will integrate with an existing Next.js frontend. The frontend is mentioned in planning documents but lives in a separate repository/directory.

**Note**: References in planning documents to "one level up" or the `ai-cd` directory indicate the existence of related codebases, likely including the existing v1 implementation and the Next.js admin dashboard.

## Important Constraints

1. **Portfolio vs. Privacy**: The `/packages/proprietary-ai` directory will be gitignored to protect intellectual property while keeping infrastructure code public

2. **Real Databases in Tests**: All integration tests use Testcontainers with real PostgreSQL and Redis instances - no mocking

3. **Phased Gates**: Implementation follows strict phase ordering. Cannot proceed to next phase until current phase's gate criteria are met

4. **Production-Ready from Start**: All code must be written with production standards (security, observability, multi-tenancy) from Phase 1 onward

## Future Commands (Post-Implementation)

Once implementation begins, this section will be updated with:
- Build commands (`npm run build`, `turbo run build`)
- Test commands (`npm test`, `npm run test:integration`)
- Development server startup
- Database migration commands
- Docker Compose commands for local infrastructure
- Linting and formatting commands

Until then, this repository contains planning artifacts only.
