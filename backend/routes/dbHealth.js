/**
 * Database health endpoint.
 *
 * Answers one question: "is the database working right now?" The app can run
 * without a database (it then serves the bundled reference data instead), so
 * this reports which of the three modes it is in — connected to the real
 * database, falling back to bundled data, or switched off entirely.
 *
 * Endpoint:
 *   GET /health/db — current database mode, response time, and a plain message.
 */
import express from "express";
import { checkDatabaseConnectivity } from "../../database/index.ts";
import { getPersistenceMode } from "../../database/bootstrap.ts";

const router = express.Router();

router.get("/health/db", async (_req, res) => {
  const started = Date.now();
  const { mode } = getPersistenceMode();

  if (mode === "fallback") {
    return res.status(206).json({
      status: "error",
      latency_ms: Date.now() - started,
      mode,
      message: "Database unreachable — serving fallback data",
    });
  }

  if (mode === "disabled") {
    return res.status(503).json({
      status: "error",
      latency_ms: Date.now() - started,
      mode,
      message: "DATABASE_URL not configured",
    });
  }

  const result = await checkDatabaseConnectivity();
  const latency_ms = result.latencyMs;
  if (!result.ok) {
    return res.status(503).json({
      status: "error",
      latency_ms,
      mode,
      message: result.error,
    });
  }

  return res.json({ status: "ok", latency_ms, mode });
});

export default router;
