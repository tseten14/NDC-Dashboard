/**
 * Saves imported figures to a local file when there is no database.
 *
 * The app is designed to run without any database set up. In that case imported
 * observations are written to a JSON file instead, so the import feature still
 * works on a laptop with nothing installed.
 *
 * This is a development and demonstration convenience, not a production store —
 * it has no concurrency handling. Production uses Postgres via services/persistence.js.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_STORE_PATH = path.resolve(__dirname, "..", "..", "data", "ingest-observations.json");

/**
 * Where ingested rows are written when Postgres is unavailable.
 *
 * Resolved per call rather than once at import so INGEST_STORE_PATH can be set
 * after this module loads — tests need their own store file, otherwise the rows
 * one run writes are still there on the next run and the confirm endpoint
 * rejects them as duplicates.
 */
function storePath() {
  return process.env.INGEST_STORE_PATH
    ? path.resolve(process.env.INGEST_STORE_PATH)
    : DEFAULT_STORE_PATH;
}

async function readStore() {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      targets: Array.isArray(parsed.targets) ? parsed.targets : [],
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
    };
  } catch {
    return { targets: [], observations: [] };
  }
}

async function writeStore(store) {
  const target = storePath();
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(store, null, 2), "utf8");
}

/**
 * Persist ingested observations to local JSON when Postgres is unavailable.
 */
export async function appendIngestedObservations(observationRows, targetLabels) {
  const store = await readStore();
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  for (const [targetId, label] of targetLabels.entries()) {
    if (!store.targets.some((t) => t.id === targetId)) {
      store.targets.push({
        id: targetId,
        sector: label,
        baseline_year: 2020,
        target_year: 2030,
        metric_type: "absolute_level",
        baseline_value: 0,
        target_value: 100,
        unit: "count",
        created_at: now,
        updated_at: now,
      });
    }
  }

  for (const o of observationRows) {
    const existingIdx = store.observations.findIndex(
      (row) => row.target_id === o.targetId && row.year === o.year,
    );
    const row = {
      id: existingIdx >= 0 ? store.observations[existingIdx].id : randomUUID(),
      target_id: o.targetId,
      year: o.year,
      value: Number(o.value),
      source: o.source,
      as_of: today,
      is_estimated: false,
      is_validated: false,
      qaqc_status: "ingested",
      created_at: existingIdx >= 0 ? store.observations[existingIdx].created_at : now,
    };
    if (existingIdx >= 0) {
      store.observations[existingIdx] = row;
    } else {
      store.observations.push(row);
    }
  }

  await writeStore(store);
  return observationRows.length;
}

export async function getFileStoreObservations(targetId) {
  const store = await readStore();
  return store.observations.filter((o) => o.target_id === targetId);
}

/**
 * Bulk lookup for the conflict check (backend/services/persistence.js
 * findObservationConflicts): given (targetId, year) pairs, returns any matching
 * rows on file, normalized to the same shape the Postgres query returns.
 */
export async function getFileStoreObservationsForPairs(pairs) {
  const store = await readStore();
  const wanted = new Set(pairs.map((p) => `${p.targetId}\0${p.year}`));
  return store.observations
    .filter((o) => wanted.has(`${o.target_id}\0${o.year}`))
    .map((o) => ({ targetId: o.target_id, year: o.year, qaqcStatus: o.qaqc_status }));
}

export async function getFileStoreTargets() {
  const store = await readStore();
  return store.targets;
}
