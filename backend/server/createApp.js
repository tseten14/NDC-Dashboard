/**
 * Shared Express app for local `server.js` and Vercel serverless (`api/index.js`).
 * Routes are mounted under `/v1` on this app; callers prefix with `/api` as needed.
 *
 * The order of the middleware below is deliberate and load-bearing. Protective
 * headers and origin rules run before anything reads the request; the rate
 * limiters run before the body is parsed, so a flood costs nothing to reject;
 * and the error handler is registered last, because Express only treats a
 * four-argument function as an error handler once every route has passed on it.
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
import authSessionRouter from "../routes/authSession.js";
import { logger, httpLoggerOptions } from "./logger.js";
import { createCorsMiddleware } from "./middleware/cors.js";
import { createHelmetMiddleware, permissionsPolicyMiddleware } from "./middleware/security.js";
import {
  readRateLimiter,
  writeRateLimiter,
  ingestWriteRateLimiter,
  aiRateLimiter,
  computeRateLimiter,
} from "./middleware/rateLimit.js";
import { isMockMode } from "../routes/health.js";

/**
 * Largest JSON body accepted.
 *
 * The dashboard assistant posts a snapshot of the current screen, which is the
 * biggest legitimate payload; 1 MB covers it with room to spare. Anything larger
 * is refused before it is parsed, so a caller cannot make the server allocate
 * memory just by claiming to send a huge document.
 */
const JSON_BODY_LIMIT = "1mb";

export function createApp() {
  const app = express();

  // Express advertises itself in a response header by default. Removing it
  // gives no protection on its own, but there is no reason to volunteer which
  // software and version is running.
  app.disable("x-powered-by");

  // How many reverse proxies sit in front of us.
  //
  // The rate limiters below bucket callers by IP address. Express only reads the
  // real visitor's address out of the X-Forwarded-For header when it is told how
  // many proxies to trust; without this it sees the proxy's own address, so on
  // Vercel every visitor in the world would share a single 200-request budget and
  // the API would start returning 429 to everyone at trivial traffic levels.
  //
  // Vercel puts exactly one proxy in front of the function, hence 1. Locally
  // there is none, hence 0. Trusting *all* hops would let a caller forge the
  // header and slip the limiter, so we count hops instead of passing `true`.
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? (process.env.VERCEL ? 1 : 0));
  app.set("trust proxy", Number.isFinite(trustProxyHops) ? trustProxyHops : 0);

  app.use(createHelmetMiddleware());
  app.use(permissionsPolicyMiddleware);
  app.use(createCorsMiddleware());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        // Reuse a caller-supplied id so one request can be followed across
        // systems, but bound its length — it is echoed back in error responses
        // and written to every log line for the request.
        const supplied = req.headers["x-request-id"];
        const id = typeof supplied === "string" && supplied.length <= 100 ? supplied : randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      ...httpLoggerOptions,
    }),
  );

  // Limiters run before the body parser so an oversized or flooding request is
  // rejected without being read into memory first.
  app.use("/v1", readRateLimiter);
  app.use("/v1", writeRateLimiter);
  app.use("/v1/ingest", ingestWriteRateLimiter);
  app.use("/v1/policy/analyze", aiRateLimiter);
  app.use("/v1/dashboard/analyze", aiRateLimiter);
  app.use("/v1/policy-impact/forecast", computeRateLimiter);

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "uganda-ndc-api",
      platform: process.env.VERCEL ? "vercel" : "node",
      mock_mode: isMockMode(),
    });
  });

  app.use("/v1", authSessionRouter);
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

  // Unknown API paths get a JSON 404 rather than Express's default HTML page,
  // which in a non-production environment would include a stack trace.
  app.use((req, res) => {
    res.status(404).json({ error: "not_found", request_id: req.id ?? undefined });
  });

  app.use((err, req, res, _next) => {
    if (err?.message?.startsWith("CORS blocked")) {
      req.log?.warn({ event: "cors_rejected", origin: req.headers?.origin ?? null }, "cors_rejected");
      return res.status(403).json({ error: "cors_forbidden" });
    }
    // A body that is too large, or not the JSON it claimed to be, is the
    // caller's mistake — answering 400 stops it being logged as a server fault.
    if (err?.type === "entity.too.large") {
      return res.status(413).json({ error: "payload_too_large" });
    }
    if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
      return res.status(400).json({ error: "invalid_json" });
    }
    req.log?.error({ err }, "unhandled_error");
    return res.status(500).json({
      error: "internal_server_error",
      request_id: req.id ?? undefined,
    });
  });

  return app;
}
