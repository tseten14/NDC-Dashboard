/**
 * Vercel serverless entry. Rewrites send /api/* here with full paths preserved.
 * Bootstraps Postgres once per warm instance (migrations + optional seed).
 * Bootstrap failures are non-fatal — the API keeps serving without persistence.
 */
import { register } from "tsx/esm/api";
register();

import express from "express";
import { createApp } from "../backend/server/createApp.js";
import { bootstrapDatabase } from "../database/bootstrap.ts";

let bootstrapPromise = null;
let bootstrapFailed = false;

function ensureDatabaseBootstrap() {
  if (bootstrapFailed) {
    return Promise.resolve({ mode: "disabled", reason: "bootstrap previously failed" });
  }
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapDatabase().catch((err) => {
      console.error("[api] db_bootstrap_failed", err?.message ?? err);
      bootstrapFailed = true;
      bootstrapPromise = null;
      return { mode: "disabled", reason: err?.message ?? "bootstrap failed" };
    });
  }
  return bootstrapPromise;
}

const api = createApp();
const app = express();

app.use(async (req, res, next) => {
  await ensureDatabaseBootstrap();
  next();
});

app.use("/api", api);
export default app;
