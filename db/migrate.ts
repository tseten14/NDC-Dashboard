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

  const hasTargets = await tableExists("targets");
  if (hasTargets && files.length > 0) {
    console.log("[db:migrate] Tables already exist — skipping migration apply");
    return;
  }

  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
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
