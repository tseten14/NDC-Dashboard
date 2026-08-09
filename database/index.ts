/**
 * The database connection.
 *
 * Opens and shares a single pool of connections, and offers a health check the
 * rest of the app uses to ask whether the database is actually reachable. If no
 * database address is configured, this reports that clearly instead of failing
 * at some later, more confusing point.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Whether to require an encrypted connection.
 *
 * Anything other than a database on this machine is reached across a network
 * the app does not control, so the traffic — which carries the credentials on
 * connect — must be encrypted. Local development against localhost is exempted,
 * because a local Postgres typically has no certificate and demanding one would
 * simply stop the app from starting.
 *
 * Set DATABASE_SSL=require or DATABASE_SSL=disable to override the guess.
 */
function resolveSslConfig(connectionString: string): pg.PoolConfig["ssl"] {
  const explicit = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (explicit === "disable" || explicit === "false") return undefined;
  if (explicit === "require" || explicit === "true") return { rejectUnauthorized: true };
  // Some managed providers issue certificates signed by their own authority.
  // This is the escape hatch for those, and it is deliberately explicit so that
  // weakening verification is a visible choice in the deployment config.
  if (explicit === "no-verify") return { rejectUnauthorized: false };

  try {
    const host = new URL(connectionString).hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
    return isLocal ? undefined : { rejectUnauthorized: true };
  } catch {
    return { rejectUnauthorized: true };
  }
}

export function getPool(): pg.Pool {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!pool) {
    const connectionString = process.env.DATABASE_URL as string;
    pool = new Pool({
      connectionString,
      ssl: resolveSslConfig(connectionString),
      // The API runs as short-lived serverless functions, and every warm
      // instance keeps its own pool. Left at the default of ten, a handful of
      // concurrent instances is enough to exhaust the database's connection
      // limit and take the whole service down — so each instance is kept small
      // and hands connections back quickly.
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      // Fail fast rather than letting a request hang while the database is
      // unreachable; a hung request holds a function slot open for its full
      // duration and is how one slow dependency becomes an outage.
      connectionTimeoutMillis: 8_000,
      // Ceiling on any single query. Without it, one pathological query can
      // hold a connection indefinitely.
      statement_timeout: 15_000,
      query_timeout: 15_000,
      application_name: "ndc-data-explorer",
    });

    // A pool emits errors for idle clients dropped by the server. With no
    // listener attached Node treats that as an unhandled error and terminates
    // the process, so a routine network blip becomes a crash.
    pool.on("error", (err) => {
      console.error("[db] idle client error:", err.message);
    });
  }
  return pool;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

export async function checkDatabaseConnectivity(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const started = Date.now();
  if (!isDatabaseConfigured()) {
    return { ok: false, latencyMs: 0, error: "DATABASE_URL not set" };
  }
  try {
    const client = getPool();
    await client.query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

export { schema };
