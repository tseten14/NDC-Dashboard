/**
 * Vercel serverless entry. Rewrites send /api/* here with full paths preserved.
 * Bootstraps Postgres once per warm instance (migrations + optional seed).
 */
import { register } from "tsx/esm/api";
register();

import express from "express";
import { createApp } from "../server/createApp.js";
import { bootstrapDatabase } from "../db/bootstrap.ts";

let bootstrapPromise = null;

function ensureDatabaseBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapDatabase().catch((err) => {
      bootstrapPromise = null;
      if (process.env.USE_DB_FALLBACK === "true") {
        return bootstrapDatabase();
      }
      throw err;
    });
  }
  return bootstrapPromise;
}

const api = createApp();
const app = express();

app.use(async (req, res, next) => {
  try {
    await ensureDatabaseBootstrap();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api", api);
export default app;
