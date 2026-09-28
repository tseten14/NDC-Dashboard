-- Creates the initial PostgreSQL tables and constraints used by optional persisted application workflows.
-- Review this migration as an append-only database contract once deployed.
DO $$ BEGIN
  CREATE TYPE "metric_type" AS ENUM('emissions_reduction', 'rising_share', 'absolute_level');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "ingest_file_type" AS ENUM('pdf', 'csv', 'json');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "ingest_job_status" AS ENUM('pending', 'processing', 'complete', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;
