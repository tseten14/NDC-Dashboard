/**
 * API server: local dev (listen) + Vercel (default export).
 * Routes: /api/v1/* and /api/health
 */
import "dotenv/config";
import express from "express";
import { createApp } from "./server/createApp.js";
import { bootstrapDatabase, getPersistenceMode } from "./db/bootstrap.ts";
import { logger } from "./server/logger.js";
import { isMockMode } from "./routes/health.js";

const app = express();
app.use("/api", createApp());

/** Vercel zero-config Express + local `npm run start:api` */
export default app;

const port = Number(process.env.API_PORT || process.env.PORT || 8787);

function printMockModeBanner() {
  const line = "═".repeat(56);
  console.log(`\n╔${line}╗`);
  console.log("║  ⚠  MOCK DATA MODE ACTIVE — not serving live data       ║");
  console.log(`╚${line}╝\n`);
  logger.warn({ event: "mock_mode_active" }, "USE_MOCK_DATA=true — Climate TRACE calls disabled");
}

async function startServer() {
  if (isMockMode()) {
    printMockModeBanner();
  }

  let persistence = { mode: "disabled", reason: "not initialized" };
  try {
    persistence = await bootstrapDatabase();
  } catch (err) {
    logger.error({ err, event: "db_bootstrap_failed" }, err.message);
    if (process.env.USE_DB_FALLBACK !== "true") {
      throw err;
    }
    persistence = getPersistenceMode();
  }

  if (!process.env.VERCEL) {
    app.listen(port, () => {
      logger.info(
        {
          event: "server_started",
          port,
          mock_mode: isMockMode(),
          persistence_mode: persistence.mode,
        },
        `NDC API listening on http://localhost:${port}`,
      );
      if (persistence.mode === "fallback") {
        logger.info({ event: "persistence_fallback" }, "USE_DB_FALLBACK=true — serving bundled seed data");
      }
    });
  }
}

startServer().catch((err) => {
  logger.error({ err }, "server_start_failed");
  process.exit(1);
});
