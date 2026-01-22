# AI-CD v2: AI Orchestrator with Human-in-Loop

[![CI](https://github.com/YOUR_ORG/ai-orchestrator-human-in-loop/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/ai-orchestrator-human-in-loop/actions/workflows/ci.yml)

**Production-ready AI Developer Platform** that autonomously handles GitHub issues by analyzing them, generating code, and creating pull requests for human review.

## 🚀 Project Status

**Current Phase**: Phase 1 - Professional Skeleton ✅ **COMPLETED**

### Phase 1 Achievements

- ✅ Turborepo monorepo with TypeScript strict mode
- ✅ Testcontainers integration (PostgreSQL + Redis)
- ✅ Drizzle ORM with migrations
- ✅ Production-grade test infrastructure
- ✅ Architectural linting (Brain/Body separation)
- ✅ Open Core stub generation for proprietary AI package
- ✅ CI/CD pipeline with GitHub Actions

**Gate Validation**: `pnpm test` passes with 5/5 integration tests using real Dockerized PostgreSQL ✅

## 📁 Repository Structure

```
ai-orchestrator-human-in-loop/
├── apps/
│   └── backend/              # (Future) Deployable API server
├── packages/
│   ├── core/                 # Core orchestration engine & database
│   ├── github-worker/        # GitHub integration (planned)
│   └── proprietary-ai/       # Private AI prompts (gitignored)
├── tests/                    # Integration tests with Testcontainers
├── docker/                   # Infrastructure configs (planned)
├── scripts/                  # Build and deployment scripts
└── plans/                    # Implementation planning documents
```

### Package Breakdown

- **@ai-cd/core**: Database schema, Drizzle ORM, state machine (Phase 1: Jobs table implemented)
- **@ai-cd/github-worker**: Webhook handling, Git operations (Phase 3)
- **@ai-cd/proprietary-ai**: Private LLM prompts and agent logic (Phase 4) - **gitignored for Open Core**
- **@ai-cd/backend**: Main application server (Phase 5)

## 🛠️ Technology Stack

**Runtime**: Node.js 20+ (LTS)
**Language**: TypeScript 5.6+ (Strict Mode)
**Build System**: Turborepo + pnpm workspaces
**Database**: PostgreSQL (via Drizzle ORM)
**Queue**: Redis + BullMQ (planned)
**Vector DB**: Qdrant (planned)
**Testing**: Vitest + Testcontainers
**AI Providers**: OpenAI GPT-4, Anthropic Claude (planned)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (LTS)
- pnpm 9+
- Docker (for tests)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd ai-orchestrator-human-in-loop

# Install dependencies (auto-generates proprietary stub)
pnpm install

# Build all packages
pnpm build

# Run type checking
pnpm type-check

# Validate architectural rules
pnpm lint:deps
```

### Running Tests

```bash
# Run integration tests (requires Docker)
pnpm test

# Run tests in watch mode
pnpm --filter @ai-cd/tests test:watch
```

**Note**: Tests use Testcontainers to spin up real PostgreSQL and Redis instances. First run may be slow while Docker images are downloaded.

## 🏗️ Architecture Overview

### "Brain & Body Split" Design

**The "Body" (Public Infrastructure)**:
- State Machine: `QUEUED → PLANNING → CODING → REVIEWING → PR_OPEN`
- GitHub Integration: Webhooks, authentication, Git operations
- Safety Layer: Policy engine preventing bad code deployment
- Multi-tenancy: Organization-scoped data isolation

**The "Brain" (Private IP)**:
- Planner Agent: Analyzes issues and generates JSON plans
- Coder Agent: Iterative code generation with context
- Critic Agent: Self-review and quality assurance

### Open Core Strategy

The orchestration engine is **open source** (public on GitHub), but the AI prompts and agent logic remain **proprietary** (gitignored). External users receive a stub package that ensures buildability.

**Stub Generation**: Run automatically via preinstall hook (`scripts/ensure-proprietary-stub.js`)

## 📊 Current Database Schema (Phase 1)

```sql
CREATE TABLE jobs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status     VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);
```

**Future Phases**: Will add tenants, repositories, issues, PRs, embeddings, and more.

## 🧪 Integration Tests

Phase 1 includes comprehensive integration tests validating:

1. **Database Connection**: Testcontainers PostgreSQL startup
2. **Migrations**: Drizzle migrations run successfully
3. **CRUD Operations**: Insert, retrieve, update jobs
4. **Multiple Records**: Batch insertions
5. **Metadata Handling**: JSON field storage
6. **Default Values**: UUID generation, timestamps

See `tests/hello-world.test.ts` for details.

## 🔒 Security & Best Practices

### Architectural Linting

The project enforces architectural boundaries using `dependency-cruiser`:

```bash
pnpm lint:deps
```

**Rules**:
- ❌ `packages/core` cannot import `packages/proprietary-ai`
- ❌ `packages/github-worker` cannot import `packages/proprietary-ai`
- ⚠️ Circular dependencies flagged as warnings

### Multi-Tenancy

**Phase 2** will introduce tenant isolation using AsyncLocalStorage, ensuring:
- Organization-scoped queries
- Row-level security in database
- No cross-tenant data leaks

## 📈 Roadmap

### Phase 2: Core Data & Multi-Tenancy (Next)
- Expand Drizzle schema (tenants, repos, issues, PRs)
- Implement AsyncLocalStorage tenant isolation
- Build CRUD services with tenant-aware queries

### Phase 3: Orchestrator Engine
- BullMQ workers for each state transition
- State machine implementation
- `IAgent` interface with `MockAgent` for testing

### Phase 4: Proprietary Intelligence
- Real `OpenAIAgent` and `ClaudeAgent` implementations
- Prompt engineering (private)
- Feedback loop (Reviewer → Coder retries)

### Phase 5: GitHub Integration & Billing
- Octokit PR creation
- Stripe metered billing
- Full E2E workflow

## 🤝 Contributing

This is a planning repository. Implementation follows strict phased gates:

1. **Read Planning Docs**: See `plans/v2-phase-*-plan.md`
2. **Follow Phase Order**: Cannot skip phases
3. **Pass Gate Tests**: Each phase has clear success criteria
4. **Architectural Compliance**: Run `pnpm lint:deps` before PRs

## 📝 Documentation

- **Master Plan**: `plans/v2-plan-master.md`
- **Phase 1 Plan**: `plans/v2-phase-1-plan.md`
- **Security & Ops**: `plans/v2-operational-security-plan.md`

## 📜 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

Built with:
- [Turborepo](https://turbo.build/repo) - Monorepo build system
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe SQL toolkit
- [Testcontainers](https://testcontainers.com/) - Dockerized integration tests
- [Vitest](https://vitest.dev/) - Fast unit test framework

---

**Status**: Phase 1 Complete ✅ | **Next**: Phase 2 - Core Data & Multi-Tenancy
