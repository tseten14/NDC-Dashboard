-- My Work ticket workflow + policy document corpus.
-- Idempotent (IF NOT EXISTS / guarded enum creation) so it is safe to apply on
-- top of the 0000 baseline whether the database is fresh or already seeded.

DO $$ BEGIN
  CREATE TYPE "activity_status" AS ENUM('planned', 'active', 'completed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "workflow_state" AS ENUM('Draft', 'Submitted', 'Pending', 'Approved', 'Declined', 'Returned');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "approval_status" AS ENUM('Pending', 'Approved', 'Rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "organization" text,
  "ministry" text,
  "districts" text[],
  "timeframe_start" date,
  "timeframe_end" date,
  "status" "activity_status" DEFAULT 'planned' NOT NULL,
  "workflow_state" "workflow_state" DEFAULT 'Draft' NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_target_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "activity_id" uuid NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "strategy" text NOT NULL,
  "target_id" text NOT NULL,
  "relationship_type" text NOT NULL,
  "expected_contribution" text,
  "approval_status" "approval_status" DEFAULT 'Pending' NOT NULL,
  "approved_by" text,
  "approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_outputs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "activity_id" uuid NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "metric_name" text NOT NULL,
  "unit" text NOT NULL,
  "value" numeric(18, 4) NOT NULL,
  "output_date" date NOT NULL,
  "method" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "activity_id" uuid NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "evidence_type" text NOT NULL,
  "link_or_file_ref" text NOT NULL,
  "notes" text,
  "submitted_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_validations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "status" text NOT NULL,
  "notes" text,
  "validated_by" text NOT NULL,
  "validated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "family_name" text,
  "family_summary" text,
  "family_date" timestamp with time zone,
  "family_url" text,
  "document_url" text,
  "content_url" text,
  "document_type" text,
  "category" text,
  "source" text,
  "geographies" text[],
  "languages" text[],
  "collection_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_passage_documents" (
  "cpr_document_id" text PRIMARY KEY NOT NULL,
  "slug" text,
  "title" text NOT NULL,
  "family_id" text,
  "family_summary" text,
  "cpr_url" text,
  "catalog_id" text,
  "passage_count" integer DEFAULT 0 NOT NULL,
  "tagged_passage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_passages" (
  "id" text PRIMARY KEY NOT NULL,
  "cpr_document_id" text NOT NULL REFERENCES "policy_passage_documents"("cpr_document_id") ON DELETE CASCADE,
  "passage_index" integer NOT NULL,
  "text_block_id" text,
  "text" text NOT NULL,
  "passage_type" text,
  "language" text,
  "topic_ids" text[],
  "topic_labels" text[]
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_workflow_state_idx" ON "activities" ("workflow_state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_created_by_idx" ON "activities" ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_ministry_idx" ON "activities" ("ministry");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_target_links_activity_id_idx" ON "activity_target_links" ("activity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_target_links_target_id_idx" ON "activity_target_links" ("target_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_outputs_activity_id_idx" ON "activity_outputs" ("activity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_evidence_activity_id_idx" ON "activity_evidence" ("activity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_validations_entity_idx" ON "activity_validations" ("entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_documents_category_idx" ON "policy_documents" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_documents_source_idx" ON "policy_documents" ("source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_documents_family_date_idx" ON "policy_documents" ("family_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_documents_fts_idx" ON "policy_documents"
  USING gin (to_tsvector('english', coalesce("title", '') || ' ' || coalesce("family_summary", '')));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_passages_document_idx" ON "policy_passages" ("cpr_document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_passages_type_idx" ON "policy_passages" ("passage_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_passages_topics_idx" ON "policy_passages" USING gin ("topic_ids");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "policy_passages_fts_idx" ON "policy_passages"
  USING gin (to_tsvector('english', "text"));
