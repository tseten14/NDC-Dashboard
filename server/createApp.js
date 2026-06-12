/**
 * Shared Express app for local `server.js` and Vercel serverless (`api/index.js`).
 * Routes are mounted under `/v1` on this app; callers prefix with `/api` as needed.
 */
import "dotenv/config";
import express from "express";
import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import emissionsRouter from "../routes/emissions.js";
import mockEmissionsRouter from "../routes/mock/emissions.js";
import ndcCockpitRouter from "../routes/ndcCockpit.js";
import documentsRouter from "../routes/documents.js";
import riskRouter from "../routes/risk.js";
import ingestRouter from "../routes/ingest.js";
import persistenceRouter from "../routes/persistence.js";
import dbHealthRouter from "../routes/dbHealth.js";
import healthRouter from "../routes/health.js";
import policyImpactRouter from "../routes/policyImpact.js";
import policyAiRouter from "../routes/policyAi.js";
import dashboardAiRouter from "../routes/dashboardAi.js";
import { logger } from "./logger.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import { createHelmetMiddleware } from "./middleware/security.js";
import { readRateLimiter, ingestWriteRateLimiter } from "./middleware/rateLimit.js";
import { isMockMode } from "../routes/health.js";

export function createApp() {
  const app = express();

  app.use(createHelmetMiddleware());
  app.use(createCorsMiddleware());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.headers["x-request-id"]?.toString() || randomUUID(),
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "uganda-ndc-api",
      platform: process.env.VERCEL ? "vercel" : "node",
      mock_mode: isMockMode(),
    });
  });

  app.use("/v1", readRateLimiter);
  app.use("/v1/ingest", ingestWriteRateLimiter);

  app.use("/v1", healthRouter);
  app.use("/v1/mock", mockEmissionsRouter);
  app.use("/v1", ndcCockpitRouter);
  app.use("/v1", documentsRouter);
  app.use("/v1", ingestRouter);
  app.use("/v1", persistenceRouter);
  app.use("/v1", dbHealthRouter);
  app.use("/v1/risk", riskRouter);
  app.use("/v1", policyImpactRouter);
  app.use("/v1", policyAiRouter);
  app.use("/v1", dashboardAiRouter);

  const useMock = isMockMode();
  app.use("/v1", useMock ? mockEmissionsRouter : emissionsRouter);

  app.use((err, req, res, _next) => {
    if (err?.message?.startsWith("CORS blocked")) {
      req.log?.warn({ err: err.message }, "cors_rejected");
      return res.status(403).json({ error: "cors_forbidden" });
    }
    req.log?.error({ err }, "unhandled_error");
    return res.status(500).json({ error: "internal_server_error" });
  });

  return app;
}
