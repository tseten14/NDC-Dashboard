import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_PATH = path.resolve(__dirname, "..", "data", "ingest-observations.json");

async function readStore() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
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
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
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
    store.observations.push({
      id: randomUUID(),
      target_id: o.targetId,
      year: o.year,
      value: Number(o.value),
      source: o.source,
      as_of: today,
      is_estimated: false,
      is_validated: false,
      qaqc_status: "ingested",
      created_at: now,
    });
  }

  await writeStore(store);
  return observationRows.length;
}

export async function getFileStoreObservations(targetId) {
  const store = await readStore();
  return store.observations.filter((o) => o.target_id === targetId);
}

export async function getFileStoreTargets() {
  const store = await readStore();
  return store.targets;
}
