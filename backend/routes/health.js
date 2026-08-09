/**
 * Service health endpoints, plus the inbox for browser error reports.
 *
 * Used by monitoring and by the app itself to check that the API is alive and
 * that its upstream data source (Climate TRACE) is reachable. The "full" check
 * is the slower, more thorough one — it actually reaches out to the database and
 * to Climate TRACE rather than just confirming the server is running.
 *
 * Also exposes isMockMode(), the single place that decides whether the app is
 * serving real live data or stand-in demo figures. Several screens show a
 * warning banner based on it, so that a demo is never mistaken for real data.
 *
 * Endpoints:
 *   GET  /health        — quick "am I up?" check
 *   GET  /health/full   — deep check: database + Climate TRACE + cache stats
 *   POST /client-errors — receives JavaScript errors from people's browsers
 */
import express from "express";
import { checkDatabaseConnectivity } from "../../database/index.ts";
import { getPersistenceMode } from "../../database/bootstrap.ts";
import { checkApiHealth } from "../services/climatetrace.js";
import { getCacheMetrics } from "../services/cacheMetrics.js";
import { logger } from "../server/logger.js";
import { clientErrorsRateLimiter } from "../server/middleware/rateLimit.js";
import { sendServerError } from "../server/errors.js";

const router = express.Router();
const startedAt = Date.now();

export function isMockMode() {
  return process.env.USE_MOCK_DATA === "true";
}

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "uganda-ndc-api",
    platform: process.env.VERCEL ? "vercel" : "node",
    mock_mode: isMockMode(),
  });
});

router.get("/health/full", async (req, res) => {
  try {
    const dbStarted = Date.now();
    const { mode } = getPersistenceMode();
    let db = { status: "disabled", latency_ms: 0 };

    if (mode === "postgres") {
      const result = await checkDatabaseConnectivity();
      db = {
        status: result.ok ? "ok" : "error",
        latency_ms: result.latencyMs ?? Date.now() - dbStarted,
      };
    } else if (mode === "fallback") {
      db = { status: "fallback", latency_ms: Date.now() - dbStarted };
    } else {
      db = { status: "disabled", latency_ms: Date.now() - dbStarted };
    }

    const ctHealth = await checkApiHealth();
    const cacheMetrics = getCacheMetrics();

    const allOk = !isMockMode() && db.status === "ok" && ctHealth.status === "ok";

    res.json({
      status: allOk ? "ok" : "degraded",
      mock_mode: isMockMode(),
      db,
      climate_trace: {
        reachable: ctHealth.status === "ok",
        last_checked: ctHealth.last_checked,
      },
      cache: {
        hit_rate: cacheMetrics.hit_rate,
        size: cacheMetrics.size,
      },
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    });
  } catch (err) {
    return sendServerError(req, res, err, "health_full_failed", {
      message: "Health check could not be completed.",
    });
  }
});

router.post("/client-errors", clientErrorsRateLimiter, (req, res) => {
  const { message, stack, url, userAgent, timestamp } = req.body ?? {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  logger.error({
    event: "client_error",
    message: message.slice(0, 2000),
    stack: typeof stack === "string" ? stack.slice(0, 8000) : undefined,
    url: typeof url === "string" ? url.slice(0, 2000) : undefined,
    userAgent: typeof userAgent === "string" ? userAgent.slice(0, 500) : req.headers["user-agent"],
    timestamp: timestamp ?? new Date().toISOString(),
  });

  return res.status(204).send();
});

export default router;
