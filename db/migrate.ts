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

export async function runMigrations(): Promise<void> {
  if (!isDatabaseConfigured()) {
    console.log("[db:migrate] DATABASE_URL not set — skipping migrations");
    return;
  }

  const pool = getPool();
  const migrationsDir = path.join(__dirname, "..", "drizzle", "migrations");
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

    for (const statement of statements) {
      await pool.query(statement);
    }
    await pool.query("INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING", [file]);
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
