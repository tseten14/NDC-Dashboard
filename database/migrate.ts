/**
 * Brings the database structure up to date.
 *
 * Applies the numbered migration files in database/migrations in order, skipping
 * any already applied. This is how the database's tables and columns are changed
 * over time without losing what is stored in them.
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, isDatabaseConfigured } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function tableExists(tableName: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS exists`,
    [tableName],
  );
  return Boolean(result.rows[0]?.exists);
}

/**
 * Arbitrary but fixed number identifying this app's migration lock.
 * Any value works as long as it never changes.
 */
const MIGRATION_LOCK_ID = 4711_2026;

export async function runMigrations(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.log("[db:migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  const pool = getPool();
  const migrationsDir = path.join(__dirname, "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Track applied migrations so each file runs once and new migrations reach
  // existing databases (instead of skipping everything once the schema exists).
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`,
  );

  // Only one process may migrate at a time.
  //
  // Migrations run automatically when the API starts, and in production the API
  // is a serverless function — so a burst of traffic can start several
  // instances at once, all of which would read "not yet applied" and run the
  // same file concurrently. A database-held lock serialises them: the others
  // wait here, then find the work already recorded as done.
  //
  // The lock is taken on a dedicated connection so that releasing it cannot be
  // confused by the pool handing the connection to someone else mid-migration.
  const lockClient = await pool.connect();
  try {
    await lockClient.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await applyPending(pool, migrationsDir, files);
  } finally {
    await lockClient.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    lockClient.release();
  }
}

async function applyPending(
  pool: ReturnType<typeof getPool>,
  migrationsDir: string,
  files: string[],
): Promise<void> {
  const appliedRes = await pool.query("SELECT filename FROM schema_migrations");
  const applied = new Set<string>(appliedRes.rows.map((r) => r.filename as string));

  // Databases created before this tracking existed already have the 0000
  // baseline (which is not idempotent). Mark it applied so it isn't re-run,
  // then let newer, idempotent migrations apply on top.
  if (applied.size === 0 && (await tableExists("targets"))) {
    const baseline = "0000_init.sql";
    if (files.includes(baseline)) {
      await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", [
        baseline,
      ]);
      applied.add(baseline);
    }
  }

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    // Apply each file as a single unit. Without this a migration that fails
    // halfway leaves the database in a state that matches neither the old
    // schema nor the new one, and is not recorded as applied — so the next
    // start retries from the beginning against a partially-changed database.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query(
        "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING",
        [file],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    console.log(`[db:migrate] Applied ${file}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("[db:migrate] Done");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[db:migrate] Failed:", err);
      process.exit(1);
    });
}
