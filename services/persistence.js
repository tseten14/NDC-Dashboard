import { desc, eq, asc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/index.ts";
import { ingestJobs, observations, targets } from "../db/schema.ts";
import { resolveTargetId } from "../db/id.ts";
import { getPersistenceMode } from "../db/bootstrap.ts";
import { mapClimateSectors, mapStrategyKpis } from "../db/seedMappings.ts";
import { climateSectorsForSeed, strategyKpis, strategyProgressRecords } from "../data/persistenceSeedSource.js";

export async function getTargets() {
  const { mode } = getPersistenceMode();
  if (mode === "postgres") {
    const db = getDb();
    const rows = await db.select().from(targets).orderBy(asc(targets.sector), asc(targets.baselineYear));
    return rows.map(formatTargetRow);
  }
  if (mode === "fallback") {
    return (await getFallbackTargets()).map(formatTargetRow);
  }
  return [];
}

export async function getObservationsForTarget(targetId) {
  const resolvedId = resolveTargetId(targetId);
  const { mode } = getPersistenceMode();
  let rows = [];
  if (mode === "postgres") {
    const db = getDb();
    rows = await db
      .select()
      .from(observations)
      .where(eq(observations.targetId, resolvedId))
      .orderBy(observations.year);
  } else if (mode === "fallback") {
    rows = await getFallbackObservations(targetId);
  }
  const { getFileStoreObservations } = await import("./ingestObservationStore.js");
  const fileRows = await getFileStoreObservations(resolvedId);
  const merged = [...rows.map(formatObservationRow), ...fileRows.map(formatObservationRow)];
  merged.sort((a, b) => a.year - b.year);
  return merged;
}

export async function getRecentIngestJobs(limit = 20) {
  const { mode } = getPersistenceMode();
  if (mode === "postgres") {
    const db = getDb();
    const rows = await db
      .select()
      .from(ingestJobs)
      .orderBy(desc(ingestJobs.createdAt))
      .limit(limit);
    return rows.map(formatIngestJobRow);
  }
  const { getMemoryIngestJobs } = await import("./ingestUploadStore.js");
  return getMemoryIngestJobs(limit);
}

function formatTargetRow(row) {
  return {
    id: row.id,
    sector: row.sector,
    baseline_year: row.baselineYear ?? row.baseline_year,
    target_year: row.targetYear ?? row.target_year,
    metric_type: row.metricType ?? row.metric_type,
    baseline_value: Number(row.baselineValue ?? row.baseline_value),
    target_value: Number(row.targetValue ?? row.target_value),
    unit: row.unit,
    created_at: row.createdAt ?? row.created_at,
    updated_at: row.updatedAt ?? row.updated_at,
  };
}

function formatObservationRow(row) {
  return {
    id: row.id,
    target_id: row.targetId ?? row.target_id,
    year: row.year,
    value: Number(row.value),
    source: row.source,
    as_of: row.asOf ?? row.as_of,
    is_estimated: row.isEstimated ?? row.is_estimated,
    is_validated: row.isValidated ?? row.is_validated,
    qaqc_status: row.qaqcStatus ?? row.qaqc_status,
    created_at: row.createdAt ?? row.created_at,
  };
}

function formatIngestJobRow(row) {
  return {
    id: row.id,
    filename: row.filename,
    file_type: row.fileType ?? row.file_type,
    status: row.status,
    row_count: row.rowCount ?? row.row_count ?? null,
    error_message: row.errorMessage ?? row.error_message ?? null,
    created_by: row.createdBy ?? row.created_by,
    created_at: row.createdAt ?? row.created_at,
    completed_at: row.completedAt ?? row.completed_at ?? null,
  };
}

async function getFallbackTargets() {
  const { targetUuid } = await import("../db/id.ts");
  const climate = mapClimateSectors(climateSectorsForSeed());
  const strategy = mapStrategyKpis(strategyKpis, []);
  const now = new Date().toISOString();
  return [...climate.targets, ...strategy.targets].map((t) => ({
    id: targetUuid(t.legacyKey),
    legacyKey: t.legacyKey,
    sector: t.sector,
    baselineYear: t.baselineYear,
    targetYear: t.targetYear,
    metricType: t.metricType,
    baselineValue: String(t.baselineValue),
    targetValue: String(t.targetValue),
    unit: t.unit,
    createdAt: now,
    updatedAt: now,
  }));
}

async function getFallbackObservations(targetId) {
  const resolvedId = resolveTargetId(targetId);
  const { observationUuid, targetUuid } = await import("../db/id.ts");
  const climate = mapClimateSectors(climateSectorsForSeed());
  const strategy = mapStrategyKpis([], strategyProgressRecords);
  const now = new Date().toISOString();
  const rows = [...climate.observations, ...strategy.observations]
    .filter((o) => targetUuid(o.targetLegacyKey) === resolvedId)
    .map((o) => ({
      id: observationUuid(o.legacyKey),
      targetId: targetUuid(o.targetLegacyKey),
      year: o.year,
      value: String(o.value),
      source: o.source,
      asOf: o.asOf,
      isEstimated: o.isEstimated,
      isValidated: o.isValidated,
      qaqcStatus: o.qaqcStatus,
      createdAt: now,
    }));
  return rows;
}

export function inferIngestFileType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "json") return "json";
  return "csv";
}

export async function createIngestJob({
  id,
  filename,
  fileType,
  status,
  rowCount,
  errorMessage,
  createdBy,
}) {
  const { mode } = getPersistenceMode();
  const now = new Date();
  const formatted = {
    id: id ?? randomUUID(),
    filename,
    file_type: fileType,
    status,
    row_count: rowCount ?? null,
    error_message: errorMessage ?? null,
    created_by: createdBy ?? "system",
    created_at: now.toISOString(),
    completed_at: status === "complete" || status === "failed" ? now.toISOString() : null,
  };

  if (mode !== "postgres") {
    const { upsertMemoryIngestJob } = await import("./ingestUploadStore.js");
    upsertMemoryIngestJob(formatted);
    return formatted;
  }

  const db = getDb();
  const [row] = await db
    .insert(ingestJobs)
    .values({
      id: formatted.id,
      filename,
      fileType,
      status,
      rowCount: rowCount ?? null,
      errorMessage: errorMessage ?? null,
      createdBy: createdBy ?? "system",
      createdAt: now,
      completedAt: status === "complete" || status === "failed" ? now : null,
    })
    .returning();
  return row ? formatIngestJobRow(row) : null;
}

export async function updateIngestJobStatus(id, { status, rowCount, errorMessage }) {
  const { mode } = getPersistenceMode();
  const now = new Date();
  const completed = status === "complete" || status === "failed";

  if (mode !== "postgres") {
    const { upsertMemoryIngestJob, getMemoryIngestJobs } = await import("./ingestUploadStore.js");
    const existing = getMemoryIngestJobs(50).find((j) => j.id === id);
    const updated = {
      ...(existing ?? { id, filename: "unknown", file_type: "csv", created_by: "system", created_at: now.toISOString() }),
      status,
      row_count: rowCount ?? existing?.row_count ?? null,
      error_message: errorMessage ?? null,
      completed_at: completed ? now.toISOString() : null,
    };
    upsertMemoryIngestJob(updated);
    return updated;
  }

  const db = getDb();
  const [row] = await db
    .update(ingestJobs)
    .set({
      status,
      rowCount: rowCount ?? undefined,
      errorMessage: errorMessage ?? null,
      completedAt: completed ? now : null,
    })
    .where(eq(ingestJobs.id, id))
    .returning();
  return row ? formatIngestJobRow(row) : null;
}

/**
 * Ensure target rows exist before observation insert (FK).
 * Used for policy-catalog categories (MCF, Executive, etc.) not in seed data.
 */
export async function ensureIngestTargets(targetLabels) {
  const { mode } = getPersistenceMode();
  if (mode !== "postgres" || !targetLabels?.size) return;

  const db = getDb();
  for (const [targetId, label] of targetLabels.entries()) {
    const existing = await db
      .select({ id: targets.id })
      .from(targets)
      .where(eq(targets.id, targetId))
      .limit(1);
    if (existing.length) continue;

    await db.insert(targets).values({
      id: targetId,
      sector: String(label).slice(0, 200),
      baselineYear: 2020,
      targetYear: 2030,
      metricType: "absolute_level",
      baselineValue: "0",
      targetValue: "100",
      unit: "count",
    });
  }
}

export async function insertObservationsBatch(observationRows, targetLabels = new Map()) {
  const { mode } = getPersistenceMode();
  if (!observationRows.length) {
    return { inserted: 0, mode, storage: null };
  }

  if (mode === "postgres") {
    await ensureIngestTargets(targetLabels);
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);
    const values = observationRows.map((o) => ({
      targetId: o.targetId,
      year: o.year,
      value: String(o.value),
      source: o.source,
      asOf: today,
      isEstimated: false,
      isValidated: false,
      qaqcStatus: "ingested",
    }));

    await db.insert(observations).values(values);
    return { inserted: values.length, mode: "postgres", storage: "postgres.observations" };
  }

  const { appendIngestedObservations } = await import("./ingestObservationStore.js");
  const inserted = await appendIngestedObservations(observationRows, targetLabels);
  return { inserted, mode: mode === "fallback" ? "fallback" : "file", storage: "data/ingest-observations.json" };
}
