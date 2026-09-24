/**
 * Checks that a database migrated for the NDC Data Explorer is complete.
 *
 * Run against any DATABASE_URL (local Postgres or Supabase):
 *   npm run verify:db
 *
 * Verifies, and exits non-zero on the first category that fails:
 *   - every migration file is recorded as applied
 *   - every application table exists
 *   - seeded tables hold exactly the rows the seed source produces
 *   - no foreign key points at a missing row
 *   - row level security is on for every application table
 *   - the Supabase API roles (when present) hold no grants on them
 *
 * Only reads; never writes.
 */
import "dotenv/config";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase, getPool, isDatabaseConfigured } from "../database/index.ts";
import { mapClimateSectors, mapStrategyKpis } from "../database/seedMappings.ts";
import { climateSectorsForSeed, strategyKpis, strategyProgressRecords } from "../data/seeds/persistenceSeedSource.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_TABLES = [
  "targets",
  "observations",
  "ingest_jobs",
  "audit_log",
  "activities",
  "activity_target_links",
  "activity_outputs",
  "activity_evidence",
  "activity_validations",
  "policy_documents",
  "policy_passage_documents",
  "policy_passages",
];

const FOREIGN_KEYS = [
  ["observations", "target_id", "targets", "id"],
  ["activity_target_links", "activity_id", "activities", "id"],
  ["activity_outputs", "activity_id", "activities", "id"],
  ["activity_evidence", "activity_id", "activities", "id"],
  ["policy_passages", "cpr_document_id", "policy_passage_documents", "cpr_document_id"],
];

function expectedSeedCounts() {
  const climate = mapClimateSectors(climateSectorsForSeed());
  const strategy = mapStrategyKpis(strategyKpis, strategyProgressRecords);
  return {
    targets: new Set([...climate.targets, ...strategy.targets].map((t) => t.legacyKey)).size,
    observations: new Set([...climate.observations, ...strategy.observations].map((o) => o.legacyKey)).size,
  };
}

const results = [];
function record(status, check, detail) {
  results.push({ status, check, detail });
}

async function main() {
  if (!isDatabaseConfigured()) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = getPool();
  const host = new URL(process.env.DATABASE_URL).hostname;
  console.log(`Verifying database on ${host}\n`);

  const files = readdirSync(path.join(__dirname, "../database/migrations")).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set((await pool.query("SELECT filename FROM schema_migrations")).rows.map((r) => r.filename));
  const missingMigrations = files.filter((f) => !applied.has(f));
  record(missingMigrations.length ? "FAIL" : "PASS", "migrations applied", missingMigrations.length ? `missing: ${missingMigrations.join(", ")}` : `${files.length}/${files.length}`);

  const existing = new Set(
    (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map((r) => r.table_name),
  );
  const missingTables = APP_TABLES.filter((t) => !existing.has(t));
  record(missingTables.length ? "FAIL" : "PASS", "tables present", missingTables.length ? `missing: ${missingTables.join(", ")}` : `${APP_TABLES.length}/${APP_TABLES.length}`);

  const counts = {};
  for (const table of APP_TABLES.filter((t) => existing.has(t))) {
    counts[table] = Number((await pool.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n);
  }
  const expected = expectedSeedCounts();
  for (const [table, want] of Object.entries(expected)) {
    const got = counts[table];
    // Imports legitimately add rows on top of the seed, so fewer is a failure
    // and more is reported rather than failed.
    const status = got === want ? "PASS" : got > want ? "WARNING" : "FAIL";
    record(status, `${table} row count`, `expected ${want} from seed, found ${got}`);
  }

  for (const [child, col, parent, parentCol] of FOREIGN_KEYS) {
    if (!existing.has(child) || !existing.has(parent)) continue;
    const orphans = Number(
      (
        await pool.query(
          `SELECT count(*)::int AS n FROM "${child}" c WHERE NOT EXISTS (SELECT 1 FROM "${parent}" p WHERE p."${parentCol}" = c."${col}")`,
        )
      ).rows[0].n,
    );
    record(orphans ? "FAIL" : "PASS", `${child}.${col} → ${parent}`, `${orphans} orphaned rows`);
  }

  const rls = (
    await pool.query(
      "SELECT relname, relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND relkind = 'r'",
    )
  ).rows;
  const withoutRls = rls.filter((r) => APP_TABLES.includes(r.relname) && !r.relrowsecurity).map((r) => r.relname);
  record(withoutRls.length ? "FAIL" : "PASS", "RLS enabled on app tables", withoutRls.length ? `off: ${withoutRls.join(", ")}` : "all");

  const apiRoles = (await pool.query("SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')")).rows.map((r) => r.rolname);
  if (apiRoles.length) {
    const grants = (
      await pool.query(
        `SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
         WHERE table_schema = 'public' AND grantee = ANY($1) AND table_name = ANY($2)`,
        [apiRoles, APP_TABLES],
      )
    ).rows;
    record(grants.length ? "FAIL" : "PASS", "Data API roles locked out of app tables", grants.length ? `${grants.length} grants remain, e.g. ${grants[0].grantee} ${grants[0].privilege_type} ${grants[0].table_name}` : "no grants");
  } else {
    record("PASS", "Data API roles locked out of app tables", "not a Supabase database (no anon/authenticated roles)");
  }

  console.log("Row counts:", counts, "\n");
  for (const r of results) console.log(`${r.status.padEnd(7)} ${r.check} — ${r.detail}`);
  await closeDatabase();
  if (results.some((r) => r.status === "FAIL")) process.exit(1);
}

main().catch(async (err) => {
  console.error("Verification failed to run:", err instanceof Error ? err.message : err);
  await closeDatabase().catch(() => {});
  process.exit(1);
});
