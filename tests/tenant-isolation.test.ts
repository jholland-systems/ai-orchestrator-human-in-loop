/**
 * Phase 2 Gate: Tenant Isolation Integration Test
 *
 * Validates that:
 * - Tenant A can access only their own repositories
 * - Tenant B can access only their own repositories
 * - Cross-tenant access attempts are properly blocked
 * - Tenant context is enforced at the database layer
 *
 * Gate Criteria: Tenant A cannot access Tenant B's data
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  createDbClient,
  schema,
  runWithTenantContext,
  createTenantAwareClient,
  TenantAccessDeniedError,
  type DbClient
} from '@ai-cd/core';
import { runMigrations } from '@ai-cd/core/db/migrate';
import { getTestDb, cleanupTestContainers } from './utils/global-setup';

const { plans, tenants, repositories } = schema;

describe('Phase 2 Gate: Tenant Isolation', () => {
  let db: DbClient;
  let tenantAwareDb: ReturnType<typeof createTenantAwareClient>;
  let tenantAId: string;
  let tenantBId: string;
  let planId: string;

  beforeAll(async () => {
    // Get or start the test database container
    const testDb = await getTestDb();

    // Run migrations
    await runMigrations(testDb.connectionString);

    // Create database clients
    db = createDbClient(testDb.connectionString);
    tenantAwareDb = createTenantAwareClient(db);

    // Create a test plan
    const insertedPlans = await db.insert(plans).values({
      name: 'test-plan',
      displayName: 'Test Plan',
      priceUsd: '0.00'
    }).returning();
    expect(insertedPlans).toHaveLength(1);
    planId = insertedPlans[0]!.id;

    // Create Tenant A
    const tenantAResult = await db.insert(tenants).values({
      githubInstallationId: 12345,
      githubAccountLogin: 'tenant-a',
      githubAccountType: 'Organization',
      installedAt: new Date(),
      planId
    }).returning();
    expect(tenantAResult).toHaveLength(1);
    tenantAId = tenantAResult[0]!.id;

    // Create Tenant B
    const tenantBResult = await db.insert(tenants).values({
      githubInstallationId: 67890,
      githubAccountLogin: 'tenant-b',
      githubAccountType: 'Organization',
      installedAt: new Date(),
      planId
    }).returning();
    expect(tenantBResult).toHaveLength(1);
    tenantBId = tenantBResult[0]!.id;
  });

  afterAll(async () => {
    // Cleanup containers after all tests
    await cleanupTestContainers();
  });

  beforeEach(async () => {
    // Clean repositories before each test
    await db.delete(repositories);
  });

  describe('Repository Creation with Tenant Isolation', () => {
    it('should create repository scoped to Tenant A', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        const insertedRepos = await tenantAwareDb.insert(repositories).values({
          githubRepoId: 1001,
          owner: 'tenant-a',
          name: 'repo-1',
          fullName: 'tenant-a/repo-1'
        }).returning();

        expect(insertedRepos).toHaveLength(1);
        const repo = insertedRepos[0]!;
        expect(repo.tenantId).toBe(tenantAId);
        expect(repo.owner).toBe('tenant-a');
      });
    });

    it('should create repository scoped to Tenant B', async () => {
      await runWithTenantContext({ tenantId: tenantBId }, async () => {
        const insertedRepos = await tenantAwareDb.insert(repositories).values({
          githubRepoId: 2001,
          owner: 'tenant-b',
          name: 'repo-1',
          fullName: 'tenant-b/repo-1'
        }).returning();

        expect(insertedRepos).toHaveLength(1);
        const repo = insertedRepos[0]!;
        expect(repo.tenantId).toBe(tenantBId);
        expect(repo.owner).toBe('tenant-b');
      });
    });

    it('should auto-inject tenantId when creating repository', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        // Note: Not explicitly setting tenantId in values
        const insertedRepos = await tenantAwareDb.insert(repositories).values({
          githubRepoId: 1002,
          owner: 'tenant-a',
          name: 'repo-2',
          fullName: 'tenant-a/repo-2'
        }).returning();

        expect(insertedRepos).toHaveLength(1);
        expect(insertedRepos[0]!.tenantId).toBe(tenantAId);
      });
    });
  });

  describe('Repository Retrieval with Tenant Isolation', () => {
    beforeEach(async () => {
      // Create repositories for both tenants
      await db.insert(repositories).values([
        {
          tenantId: tenantAId,
          githubRepoId: 1001,
          owner: 'tenant-a',
          name: 'repo-1',
          fullName: 'tenant-a/repo-1'
        },
        {
          tenantId: tenantAId,
          githubRepoId: 1002,
          owner: 'tenant-a',
          name: 'repo-2',
          fullName: 'tenant-a/repo-2'
        },
        {
          tenantId: tenantBId,
          githubRepoId: 2001,
          owner: 'tenant-b',
          name: 'repo-1',
          fullName: 'tenant-b/repo-1'
        }
      ]);
    });

    it('should only retrieve repositories belonging to Tenant A', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        const repos = await tenantAwareDb.select(repositories);

        expect(repos).toHaveLength(2);
        repos.forEach(repo => {
          expect(repo.tenantId).toBe(tenantAId);
          expect(repo.owner).toBe('tenant-a');
        });
      });
    });

    it('should only retrieve repositories belonging to Tenant B', async () => {
      await runWithTenantContext({ tenantId: tenantBId }, async () => {
        const repos = await tenantAwareDb.select(repositories);

        expect(repos).toHaveLength(1);
        expect(repos[0]!.tenantId).toBe(tenantBId);
        expect(repos[0]!.owner).toBe('tenant-b');
      });
    });

    it('should return empty array when tenant has no repositories', async () => {
      // Create a new tenant with no repos
      const tenantCResult = await db.insert(tenants).values({
        githubInstallationId: 99999,
        githubAccountLogin: 'tenant-c',
        githubAccountType: 'Organization',
        installedAt: new Date(),
        planId
      }).returning();
      const tenantCId = tenantCResult[0]!.id;

      await runWithTenantContext({ tenantId: tenantCId }, async () => {
        const repos = await tenantAwareDb.select(repositories);
        expect(repos).toHaveLength(0);
      });
    });
  });

  describe('Repository Update with Tenant Isolation', () => {
    let repoAId: string;
    let repoBId: string;

    beforeEach(async () => {
      // Create one repo for each tenant
      const repoA = await db.insert(repositories).values({
        tenantId: tenantAId,
        githubRepoId: 1001,
        owner: 'tenant-a',
        name: 'repo-1',
        fullName: 'tenant-a/repo-1',
        enabled: true
      }).returning();
      repoAId = repoA[0]!.id;

      const repoB = await db.insert(repositories).values({
        tenantId: tenantBId,
        githubRepoId: 2001,
        owner: 'tenant-b',
        name: 'repo-1',
        fullName: 'tenant-b/repo-1',
        enabled: true
      }).returning();
      repoBId = repoB[0]!.id;
    });

    it('should update repository belonging to current tenant', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        const updated = await tenantAwareDb.update(repositories)
          .set({ enabled: false })
          .where(eq(repositories.id, repoAId))
          .returning();

        expect(updated).toHaveLength(1);
        expect(updated[0]!.id).toBe(repoAId);
        expect(updated[0]!.enabled).toBe(false);
      });
    });

    it('should NOT update repository belonging to different tenant', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        // Tenant A tries to update Tenant B's repository
        const updated = await tenantAwareDb.update(repositories)
          .set({ enabled: false })
          .where(eq(repositories.id, repoBId))
          .returning();

        // Should return empty - repository not found in Tenant A's scope
        expect(updated).toHaveLength(0);
      });

      // Verify Tenant B's repo is unchanged
      const repoBCheck = await db.select().from(repositories)
        .where(eq(repositories.id, repoBId));
      expect(repoBCheck[0]!.enabled).toBe(true);
    });
  });

  describe('Repository Deletion with Tenant Isolation', () => {
    let repoAId: string;
    let repoBId: string;

    beforeEach(async () => {
      const repoA = await db.insert(repositories).values({
        tenantId: tenantAId,
        githubRepoId: 1001,
        owner: 'tenant-a',
        name: 'repo-1',
        fullName: 'tenant-a/repo-1'
      }).returning();
      repoAId = repoA[0]!.id;

      const repoB = await db.insert(repositories).values({
        tenantId: tenantBId,
        githubRepoId: 2001,
        owner: 'tenant-b',
        name: 'repo-1',
        fullName: 'tenant-b/repo-1'
      }).returning();
      repoBId = repoB[0]!.id;
    });

    it('should delete repository belonging to current tenant', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        const deleted = await tenantAwareDb.delete(repositories)
          .where(eq(repositories.id, repoAId))
          .returning();

        expect(deleted).toHaveLength(1);
        expect(deleted[0]!.id).toBe(repoAId);
      });

      // Verify it's actually deleted
      const check = await db.select().from(repositories)
        .where(eq(repositories.id, repoAId));
      expect(check).toHaveLength(0);
    });

    it('should NOT delete repository belonging to different tenant', async () => {
      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        // Tenant A tries to delete Tenant B's repository
        const deleted = await tenantAwareDb.delete(repositories)
          .where(eq(repositories.id, repoBId))
          .returning();

        // Should return empty - repository not found in Tenant A's scope
        expect(deleted).toHaveLength(0);
      });

      // Verify Tenant B's repo still exists
      const repoBCheck = await db.select().from(repositories)
        .where(eq(repositories.id, repoBId));
      expect(repoBCheck).toHaveLength(1);
      expect(repoBCheck[0]!.id).toBe(repoBId);
    });
  });

  describe('Ownership Verification', () => {
    it('should verify ownership for entity belonging to current tenant', async () => {
      const repo = await db.insert(repositories).values({
        tenantId: tenantAId,
        githubRepoId: 1001,
        owner: 'tenant-a',
        name: 'repo-1',
        fullName: 'tenant-a/repo-1'
      }).returning();

      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        // Should not throw
        expect(() => {
          tenantAwareDb.verifyOwnership(repo[0]!, 'Repository');
        }).not.toThrow();
      });
    });

    it('should throw TenantAccessDeniedError for entity belonging to different tenant', async () => {
      const repo = await db.insert(repositories).values({
        tenantId: tenantBId,
        githubRepoId: 2001,
        owner: 'tenant-b',
        name: 'repo-1',
        fullName: 'tenant-b/repo-1'
      }).returning();

      await runWithTenantContext({ tenantId: tenantAId }, async () => {
        // Tenant A tries to verify ownership of Tenant B's repo
        expect(() => {
          tenantAwareDb.verifyOwnership(repo[0]!, 'Repository');
        }).toThrow(TenantAccessDeniedError);
      });
    });
  });
});
