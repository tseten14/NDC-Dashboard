-- Close the Supabase Data API over the application's own tables.
--
-- Supabase publishes every table in the public schema through its REST API
-- (PostgREST), reachable by anyone holding the publishable key — which is
-- compiled into the browser bundle and therefore public. These tables are only
-- ever read and written by the Express API, which connects as the table owner
-- and so is not subject to row level security. Enabling RLS with no policies,
-- and revoking the API roles' grants, means the REST API sees nothing while the
-- app itself is unaffected.
--
-- On plain Postgres (local development, CI) the anon / authenticated roles do
-- not exist; the grants are skipped there and RLS is harmless.

ALTER TABLE "targets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "observations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ingest_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_target_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_outputs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_evidence" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "activity_validations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "policy_documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "policy_passage_documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "policy_passages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_deals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "schema_migrations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  api_role text;
  tbl text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      FOREACH tbl IN ARRAY ARRAY[
        'targets', 'observations', 'ingest_jobs', 'audit_log',
        'activities', 'activity_target_links', 'activity_outputs',
        'activity_evidence', 'activity_validations',
        'policy_documents', 'policy_passage_documents', 'policy_passages',
        'marketplace_deals', 'schema_migrations'
      ] LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', tbl, api_role);
      END LOOP;
    END IF;
  END LOOP;
END
$$;
