import { v5 as uuidv5 } from "uuid";

/** Stable namespace for deterministic UUIDs from legacy string keys (t1, KPI-*, climate-afolu). */
const NAMESPACE = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

export function targetUuid(legacyKey: string): string {
  return uuidv5(`target:${legacyKey}`, NAMESPACE);
}

export function observationUuid(legacyKey: string): string {
  return uuidv5(`observation:${legacyKey}`, NAMESPACE);
}

export function ingestJobUuid(legacyKey: string): string {
  return uuidv5(`ingest:${legacyKey}`, NAMESPACE);
}

/** Resolve API target id (legacy key or UUID) to DB target UUID. */
export function resolveTargetId(targetId: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    return targetId;
  }
  return targetUuid(targetId);
}
