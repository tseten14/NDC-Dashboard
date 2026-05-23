/**
 * Shared Express app for local `server.js` and Vercel serverless (`api/index.js`).
 * Routes are mounted under `/v1` on this app; callers prefix with `/api` as needed.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import emissionsRouter from "../routes/emissions.js";
import mockEmissionsRouter from "../routes/mock/emissions.js";
import ndcCockpitRouter from "../routes/ndcCockpit.js";
import riskRouter from "../routes/risk.js";
import ingestRouter from "../routes/ingest.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "uganda-ndc-api",
      platform: process.env.VERCEL ? "vercel" : "node",
    });
  });

  app.use("/v1/mock", mockEmissionsRouter);
  app.use("/v1", ndcCockpitRouter);
  app.use("/v1", ingestRouter);
  app.use("/v1/risk", riskRouter);

  const useMock = process.env.USE_MOCK_DATA === "true";
  app.use("/v1", useMock ? mockEmissionsRouter : emissionsRouter);

  return app;
}
