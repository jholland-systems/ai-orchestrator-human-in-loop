# Phase 2: Core Data & Multi-Tenancy 💾 - Detailed Plan

**Focus**: This phase is dedicated to establishing the core data models and implementing robust multi-tenancy. The goal is to bring the backend's data structures into parity with the existing Next.js frontend's schema expectations, ensuring tenant isolation at the application layer.

## Tasks

### 1. Port existing SQL schema to Drizzle

This task involves translating the current database schema into Drizzle ORM definitions within the `/packages/core` package.

*   **1.1 Analyze Existing Schema**:
    *   **Action**: Obtain the SQL schema from the existing project or relevant ORM definitions.
    *   **Reference**: Review schema definitions in the `ai-cd` directory (one level up) to identify all tables, columns, relationships, and constraints. Focus on `Organization`, `Repository`, `User`, `Job`, and any other entities relevant to multi-tenancy and the frontend's data needs.
*   **1.2 Define Drizzle Schemas**:
    *   **Location**: Create Drizzle schema files (e.g., `packages/core/src/db/schema/*.ts`) for each identified table (e.g., `users.ts`, `organizations.ts`, `repositories.ts`, `jobs.ts`, etc.).
    *   **Action**: Translate SQL column types (e.g., `text`, `integer`, `timestamp`, `uuid`), constraints (primary keys, foreign keys, uniqueness, nullability, defaults), and relationships (one-to-many, many-to-many) into Drizzle ORM syntax using its fluent API.
    *   **Action**: Ensure proper TypeScript types are inferred or explicitly defined for each schema to provide full type safety.
*   **1.3 Initial Drizzle Migration**:
    *   **Action**: Generate an initial Drizzle migration based on the newly defined schemas using `drizzle-kit generate`. This migration will represent the full target schema for the application.
    *   **Action**: Manually review the generated SQL (`drizzle/migrations/*.sql`) against the existing schema to ensure fidelity and correctness, especially for complex types or constraints.
*   **1.4 Update Test Setup**:
    *   **Action**: Modify the Phase 1 Testcontainers setup (e.g., in `tests/setup.ts` or a test helper) to apply this comprehensive Drizzle migration after spinning up the test PostgreSQL database. This ensures all tests run against the full schema.

### 2. Implement Row Level Security (RLS) equivalents in the application layer (Tenant Isolation)

This crucial task focuses on enforcing data separation between different tenants (organizations) at the application logic level, effectively simulating RLS without direct database RLS policies.

*   **2.1 Define Tenant Context with AsyncLocalStorage**:
    *   **Action**: Establish a mechanism to identify the current tenant (`organizationId`) using Node.js's `AsyncLocalStorage`.
    *   **Implementation**: Create a global `AsyncLocalStorage` instance (e.g., `tenantContextStore`).
    *   **Usage**: In the Fastify request lifecycle (e.g., a pre-handler hook), extract the `organizationId` from the authenticated user's session/token. Then, use `tenantContextStore.run(() => { /* execute request handling */ })` to make the `organizationId` implicitly available throughout the call stack without passing it as an argument.
    *   **Benefit**: This prevents "prop drilling" (`(ctx, orgId, ...args)`) in service layers, making the codebase cleaner and easier to refactor, while still ensuring tenant isolation.
    *   **Action**: The `organizationId` will typically be extracted from the authenticated user's session or token (e.g., a JWT payload).
*   **2.2 Extend Drizzle Client for Tenant Context**:
    *   **Action**: Create a wrapper or a custom Drizzle client instance that, when initialized with a `currentTenantId`, automatically applies `WHERE organizationId = currentTenantId` clauses to all relevant queries (reads, updates, deletes) for multi-tenant tables. This can be achieved using Drizzle's query builders or by creating utility functions that always include the tenant filter.
    *   **Action**: Ensure this tenant-aware client is used consistently by all data access operations that deal with multi-tenant data, preventing accidental cross-tenant data access.
*   **2.3 Implement Ownership Checks**:
    *   **Action**: For entities that might not directly contain an `organizationId` (e.g., `User` entity that belongs to an `Organization`), or for complex relationships, implement explicit ownership checks within service layers. These checks verify that the authenticated user/tenant has permission to access or modify a specific resource before the operation proceeds.
*   **2.4 Error Handling for Unauthorized Access**:
    *   **Action**: Define specific, custom error types (e.g., `TenantAccessDeniedError`, `ResourceNotFoundError`) to be thrown when a tenant attempts to access or manipulate data belonging to another tenant.
    *   **Action**: Ensure these custom errors are caught by the Fastify error handler and transformed into appropriate HTTP responses (e.g., `403 Forbidden` for direct access attempts, or `404 Not Found` for obfuscation when a resource doesn't exist *for the current tenant*).

### 3. Build "Organization/Repository" CRUD services

This task involves creating the basic API endpoints and business logic for managing `Organization` and `Repository` entities, with multi-tenancy enforced.

*   **3.1 Define API Endpoints**:
    *   **Action**: Design clear and consistent RESTful API endpoints for Create, Read, Update, and Delete (CRUD) operations on `Organization` and `Repository` entities within the `/apps/backend` application.
    *   **Example Endpoints**:
        *   `POST /organizations` (Create a new organization)
        *   `GET /organizations` (List organizations for the current user/tenant)
        *   `GET /organizations/:orgId` (Get a specific organization by ID)
        *   `PUT /organizations/:orgId` (Update an organization)
        *   `DELETE /organizations/:orgId` (Delete an organization)
        *   `POST /organizations/:orgId/repositories` (Create a new repository within an organization)
        *   `GET /organizations/:orgId/repositories` (List repositories for a specific organization)
        *   `GET /organizations/:orgId/repositories/:repoId` (Get a specific repository)
        *   `PUT /organizations/:orgId/repositories/:repoId` (Update a repository)
        *   `DELETE /organizations/:orgId/repositories/:repoId` (Delete a repository)
*   **3.2 Implement Fastify Routes**:
    *   **Action**: Implement these endpoints as routes using Fastify within `/apps/backend`. Organize routes logically (e.g., `src/routes/organizations.ts`, `src/routes/repositories.ts`).
    *   **Action**: Integrate request validation for incoming payloads (e.g., using Fastify's built-in JSON schema validation or a library like Zod combined with `@fastify/type-provider-zod`).
    *   **Action**: Ensure that the `organizationId` from the request context is correctly passed down to service layers.
*   **3.3 Create Service Layers**:
    *   **Location**: Within `/apps/backend` (or potentially `/packages/core` for shared business logic, depending on granularity), create dedicated service functions or classes (e.g., `OrganizationService`, `RepositoryService`) that encapsulate the business logic for CRUD operations.
    *   **Action**: These services will utilize the tenant-aware Drizzle client (from Task 2.2) to interact with the database, ensuring all operations are tenant-scoped.
    *   **Action**: Implement any additional business rules for creating/updating organizations and repositories (e.g., ensuring organization names are unique per user, or enforcing repository naming conventions).
*   **3.4 Integration Tests for CRUD Services**:
    *   **Action**: Write comprehensive integration tests for each CRUD endpoint. Use a testing framework like Vitest.
    *   **Scenario**: Simulate authenticated requests originating from different tenants (`Tenant A`, `Tenant B`).
    *   **Verification**: Ensure that `Tenant A` can successfully perform CRUD operations on its *own* organizations/repositories. Critically, verify that `Tenant A`'s attempts to access or modify data belonging to `Tenant B` result in the appropriate authorization errors (e.g., `403 Forbidden` or `404 Not Found`), never returning `Tenant B`'s data.

## Gate

✅ Integration tests proving Tenant A cannot access Tenant B's data. This includes:
*   Tests verifying that `GET`, `PUT`, `DELETE` operations on an organization or repository by `Tenant A` correctly return `Tenant A`'s data and *fail* when attempting to access `Tenant B`'s data (returning `403 Forbidden` or `404 Not Found`).
*   Tests confirming that creating a repository for `Tenant A` correctly scopes it to `Tenant A` and cannot be accessed by `Tenant B`.
*   All Drizzle schemas are accurately defined, and database migrations are successfully applied during test setup.
*   The tenant-aware Drizzle client correctly filters all data access operations related to multi-tenant entities.
*   All "Organization" and "Repository" CRUD endpoints are functional and secure from cross-tenant data leakage.