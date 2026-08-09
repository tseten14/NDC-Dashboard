-- Core tables, integrity rules and indexes.
--
-- Two problems are fixed here.
--
-- First, the four oldest tables — targets, observations, ingest_jobs and
-- audit_log — were described in schema.ts but no migration ever created them.
-- Any database built by running the migrations in order came up missing them,
-- so the app silently fell back to serving bundled data and nothing was ever
-- written. They are created here, with IF NOT EXISTS so that databases which
-- acquired them by other means are left untouched.
--
-- Second, the rules that keep imported data trustworthy lived only in
-- application code. Anything writing to the database directly — a migration, a
-- console session, a future service — could bypass them. Values a column cannot
-- legitimately hold are now rejected by the database itself.

CREATE TABLE IF NOT EXISTS "targets" (
  "id" uuid PRIMARY KEY,
  "sector" text NOT NULL,
  "baseline_year" integer NOT NULL,
  "target_year" integer NOT NULL,
  "metric_type" "metric_type" NOT NULL,
  "baseline_value" numeric(18, 4) NOT NULL,
  "target_value" numeric(18, 4) NOT NULL,
  "unit" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "observations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_id" uuid NOT NULL REFERENCES "targets"("id") ON DELETE CASCADE,
  "year" integer NOT NULL,
  "value" numeric(18, 4) NOT NULL,
  "source" text NOT NULL,
  "as_of" date NOT NULL,
  "is_estimated" boolean NOT NULL DEFAULT false,
  "is_validated" boolean NOT NULL DEFAULT false,
  "qaqc_status" text NOT NULL DEFAULT 'ok',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingest_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "filename" text NOT NULL,
  "file_type" "ingest_file_type" NOT NULL,
  "status" "ingest_job_status" NOT NULL DEFAULT 'pending',
  "row_count" integer,
  "error_message" text,
  "created_by" text NOT NULL DEFAULT 'system',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "action" text NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "performed_by" text NOT NULL,
  "performed_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- A year outside this range is a parsing mistake, not a measurement. Catching
-- it at the database means a bad import cannot leave a value that would later
-- distort a chart axis or a trend line.
ALTER TABLE "observations" DROP CONSTRAINT IF EXISTS "observations_year_range";
--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_year_range"
  CHECK ("year" BETWEEN 1900 AND 2100);
--> statement-breakpoint

-- qaqc_status drives whether an upload is allowed to replace an existing row,
-- so an unrecognised value would fall through that decision unpredictably.
ALTER TABLE "observations" DROP CONSTRAINT IF EXISTS "observations_qaqc_status_allowed";
--> statement-breakpoint
ALTER TABLE "observations" ADD CONSTRAINT "observations_qaqc_status_allowed"
  CHECK ("qaqc_status" IN ('ok', 'ingested', 'validated', 'warning', 'error'));
--> statement-breakpoint

ALTER TABLE "targets" DROP CONSTRAINT IF EXISTS "targets_year_order";
--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_year_order"
  CHECK ("target_year" >= "baseline_year");
--> statement-breakpoint

-- Free-text columns that only ever hold short labels are bounded so a very
-- large value cannot be stored to bloat the table or a later response.
ALTER TABLE "targets" DROP CONSTRAINT IF EXISTS "targets_sector_length";
--> statement-breakpoint
ALTER TABLE "targets" ADD CONSTRAINT "targets_sector_length"
  CHECK (char_length("sector") BETWEEN 1 AND 300);
--> statement-breakpoint
ALTER TABLE "ingest_jobs" DROP CONSTRAINT IF EXISTS "ingest_jobs_filename_length";
--> statement-breakpoint
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_filename_length"
  CHECK (char_length("filename") BETWEEN 1 AND 300);
--> statement-breakpoint

-- Indexes for the lookups the API actually performs. Without them every
-- observation read is a full table scan, which is both slow and a cheap way for
-- an anonymous caller to load the database.
CREATE INDEX IF NOT EXISTS "observations_target_id_year_idx"
  ON "observations" ("target_id", "year");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "observations_qaqc_status_idx"
  ON "observations" ("qaqc_status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingest_jobs_created_at_idx"
  ON "ingest_jobs" ("created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx"
  ON "audit_log" ("entity_type", "entity_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "targets_sector_idx" ON "targets" ("sector");
