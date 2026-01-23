CREATE TYPE "public"."installation_status_enum" AS ENUM('pending', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"price_usd" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"billing_interval" varchar(20) DEFAULT 'monthly' NOT NULL,
	"max_repos" integer DEFAULT 3 NOT NULL,
	"max_prs_per_month" integer DEFAULT 10 NOT NULL,
	"max_tokens_per_month" bigint DEFAULT 1000000 NOT NULL,
	"max_llm_calls_per_month" integer DEFAULT 100 NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plans_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"github_installation_id" bigint NOT NULL,
	"github_account_login" varchar(255) NOT NULL,
	"github_account_type" varchar(50) NOT NULL,
	"installed_at" timestamp with time zone NOT NULL,
	"uninstalled_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"installation_status" "installation_status_enum" DEFAULT 'pending' NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_changed_at" timestamp with time zone,
	CONSTRAINT "tenants_github_installation_id_unique" UNIQUE("github_installation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "repositories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"github_repo_id" bigint NOT NULL,
	"owner" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"full_name" varchar(510) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"policy_overrides" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "repositories_github_repo_id_unique" UNIQUE("github_repo_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "repositories" ADD CONSTRAINT "repositories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tenants_installation_status" ON "tenants" USING btree ("installation_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_repositories_tenant_id" ON "repositories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_repositories_github_repo_id" ON "repositories" USING btree ("github_repo_id");