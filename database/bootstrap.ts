/**
 * Works out how the app should store data at startup.
 *
 * Settles on one of three modes and reports it:
 *  - postgres: a real database is configured and reachable
 *  - fallback: no database, so bundled reference data is served instead
 *  - disabled: no database and no fallback, so saving is switched off
 *
 * This is what allows the app to run on a laptop with nothing installed while
 * still using a proper database in production.
 */
import "dotenv/config";
import { runMigrations } from "./migrate.js";
import { runSeed } from "./seed.js";
import { checkDatabaseConnectivity, isDatabaseConfigured } from "./index.js";

export type PersistenceMode = "postgres" | "fallback" | "disabled";

let activeMode: PersistenceMode = "disabled";
let modeReason = "DATABASE_URL not configured";

export function getPersistenceMode(): { mode: PersistenceMode; reason: string } {
  return { mode: activeMode, reason: modeReason };
}

export async function bootstrapDatabase(): Promise<{ mode: PersistenceMode; reason: string }> {
  if (!isDatabaseConfigured()) {
    activeMode = process.env.USE_DB_FALLBACK === "true" ? "fallback" : "disabled";
    modeReason = "DATABASE_URL not set";
    return getPersistenceMode();
  }

  try {
    await runMigrations();
    const health = await checkDatabaseConnectivity();
    if (!health.ok) {
      throw new Error(health.error ?? "Database connectivity check failed");
    }

    // Seeding writes reference rows. It is idempotent, but running it on every
    // cold start in production means a leftover SEED_DB=true from initial setup
    // quietly re-asserts seed data against the live database forever. Require
    // the intent to be stated explicitly for a production deployment.
    if (process.env.SEED_DB === "true") {
      const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
      if (isProduction && process.env.ALLOW_PRODUCTION_SEED !== "true") {
        console.warn(
          "[db:seed] SEED_DB=true ignored in production. Set ALLOW_PRODUCTION_SEED=true for a one-off seed, then remove both.",
        );
      } else {
        const counts = await runSeed();
        console.log(
          `[db:seed] Inserted/verified ${counts.targets} targets, ${counts.observations} observations`,
        );
      }
    }

    activeMode = "postgres";
    modeReason = "Connected to Postgres";
    return getPersistenceMode();
  } catch (err) {
    // The driver's message names the host, port, user and database. It is
    // written to the server log, but modeReason is a value other code may
    // surface, so it is kept generic.
    const message = err instanceof Error ? err.message : String(err);
    console.error("[db:bootstrap] database unavailable:", message);
    if (process.env.USE_DB_FALLBACK === "true") {
      activeMode = "fallback";
      modeReason = "Postgres unavailable — using bundled reference data";
      return getPersistenceMode();
    }
    activeMode = "disabled";
    modeReason = "Postgres unavailable";
    throw err;
  }
}
