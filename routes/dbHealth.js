import express from "express";
import { checkDatabaseConnectivity } from "../db/index.ts";
import { getPersistenceMode } from "../db/bootstrap.ts";

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
