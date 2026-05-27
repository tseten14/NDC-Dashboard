import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "uganda-ndc-api" },
});

export function logSlugFetch({ slug, year, status, duration_ms, error }) {
  const level = status === "success" ? "info" : "warn";
  logger[level]({
    event: "slug_fetch",
    slug,
    year,
    status,
    duration_ms,
    ...(error ? { error } : {}),
  });
}

export function logCacheAccess({ key, hit, age_seconds }) {
  logger.info({
    event: "cache_access",
    key,
    hit,
    age_seconds: age_seconds ?? null,
  });
}

export function logIngestEvent({ accepted, filename, fileType, rowCount, rejected_reason }) {
  if (accepted) {
    logger.info({
      event: "ingest_accepted",
      filename,
      fileType,
      rowCount: rowCount ?? null,
    });
  } else {
    logger.warn({
      event: "ingest_rejected",
      filename: filename ?? null,
      fileType: fileType ?? null,
      rejected_reason,
    });
  }
}

export function logReconciliationDelta({ target_id, delta_pct, reference_year }) {
  if (delta_pct == null) return;
  logger.info({
    event: "reconciliation_delta",
    target_id,
    delta_pct,
    reference_year: reference_year ?? null,
  });
}
