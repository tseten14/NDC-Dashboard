/**
 * API server: local dev (listen) + Vercel (default export).
 * Routes: /api/v1/* and /api/health
 */
import "dotenv/config";
import express from "express";
import { createApp } from "./server/createApp.js";

const app = express();
app.use("/api", createApp());

/** Vercel zero-config Express + local `npm run start:api` */
export default app;

const port = Number(process.env.API_PORT || process.env.PORT || 8787);
const useMock = process.env.USE_MOCK_DATA === "true";

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`NDC API listening on http://localhost:${port}`);
    console.log(
      `  USE_MOCK_DATA=${useMock} (${useMock ? "mock fixtures" : "Climate TRACE v7 live + bundled catalog/risk"})`,
    );
    console.log("  Data: Climate TRACE v7 (live) + bundled catalog/risk. No remote database.");
  });
}
