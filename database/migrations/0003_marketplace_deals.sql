-- Marketplace deals: pitch-evaluate-deliver pipeline
CREATE TABLE IF NOT EXISTS "marketplace_deals" (
  "id" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "ministry" text NOT NULL,
  "sector" text NOT NULL,
  "sector_id" text NOT NULL,
  "geography" text NOT NULL,
  "stage" text NOT NULL DEFAULT 'Concept',
  "problem" text NOT NULL,
  "intervention" text NOT NULL,
  "ask_m" numeric(12, 2) NOT NULL,
  "co_finance_m" numeric(12, 2) NOT NULL,
  "annual_mt_co2e" numeric(12, 4) NOT NULL,
  "instrument" text NOT NULL,
  "ndc_target" text NOT NULL,
  "readiness" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "evaluation" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "milestones" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
