/**
 * Application logging.
 *
 * One shared logger, plus a few named helpers for the events worth being able to
 * search for later: calls to Climate TRACE, cache hits and misses, data imports,
 * and reconciliation gaps between the app's sector totals and Climate TRACE's
 * national figure. Logs are written as structured JSON so they can be filtered
 * by field rather than by grepping text.
 *
 * Logs are treated as something that will be read by more people than wrote
 * them — shipped to a log service, pasted into a ticket, kept for months. So
 * anything that could be replayed to impersonate a caller is removed on the way
 * out rather than trusted not to appear.
 */
import pino from "pino";

/**
 * Fields never written to a log line.
 *
 * The request logger records incoming headers by default, which means the
 * operator passphrase, the session cookie and any authorization token were
 * being written in full on every single request — turning the log itself into a
 * set of working credentials for anyone who could read it.
 *
 * Cookies are dropped wholesale rather than filtered by name: the session cookie
 * is the one that matters today, but a future cookie would otherwise be logged
 * silently until someone noticed.
 */
const REDACTED_PATHS = [
  'req.headers["x-api-key"]',
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  // Same fields again for log lines that pass a bare object rather than a request.
  "headers.cookie",
  'headers["x-api-key"]',
  "headers.authorization",
  "passphrase",
  "password",
  "token",
  "apiKey",
  "api_key",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "INGEST_API_KEY",
  "SESSION_SECRET",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "uganda-ndc-api" },
  redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
});

/**
 * Extra settings for the per-request logger.
 *
 * Redaction above covers the headers, but a database or upstream failure can
 * still carry a connection string or a signed URL inside its message. Rather
 * than log the raw error object, only the parts that help diagnose a fault are
 * kept, and the message is truncated so a very long upstream body cannot fill
 * the log.
 */
export const httpLoggerOptions = {
  redact: { paths: REDACTED_PATHS, censor: "[redacted]" },
  serializers: {
    // Allow-list the request fields worth keeping rather than logging every
    // header and removing the dangerous ones. A deny-list only protects against
    // the headers someone thought of; this protects against all of them,
    // including ones a future proxy starts adding.
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: typeof req.url === "string" ? req.url.slice(0, 500) : undefined,
        remoteAddress: req.remoteAddress,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
    err(err) {
      if (!err) return err;
      return {
        type: err.name ?? err.constructor?.name ?? "Error",
        message: typeof err.message === "string" ? err.message.slice(0, 500) : undefined,
        code: err.code,
        stack: typeof err.stack === "string" ? err.stack.slice(0, 2000) : undefined,
      };
    },
  },
};

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
