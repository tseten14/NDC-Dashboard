/**
 * Local development API server (port 8787).
 * Production API on Vercel uses `api/index.js` (same routes under /api/v1).
 */
import express from "express";
import { createApp } from "./server/createApp.js";

const root = express();
root.use("/api", createApp());

const port = Number(process.env.API_PORT || 8787);
const useMock = process.env.USE_MOCK_DATA === "true";

root.listen(port, () => {
  console.log(`NDC API listening on http://localhost:${port}`);
  console.log(
    `  USE_MOCK_DATA=${useMock} (${useMock ? "mock fixtures" : "Climate TRACE v7 live + bundled catalog/risk"})`,
  );
  console.log("  Data: Climate TRACE v7 (live) + bundled catalog/risk. No remote database.");
});
