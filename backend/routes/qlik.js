/** Public, read-only CSV feeds for Qlik Cloud. */
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { defaultInventoryRange } from "../../config/climateTrace.js";
import { getEmissionsDashboard } from "../services/emissionsData.js";
import { formatQlikEmissionsCsv } from "../services/qlikExport.js";
import { isMockMode } from "./health.js";
import { sendServerError } from "../server/errors.js";

const router = express.Router();
// Node and Vercel start at the repository root; Vitest starts in frontend/.
const targetFile = "data/exports/uganda-ndc-targets-2022.csv";
const targetsCsvPath = [path.resolve(targetFile), path.resolve("..", targetFile)]
  .find((candidate) => fs.existsSync(candidate)) ?? path.resolve(targetFile);

router.get("/qlik/targets.csv", (req, res) => {
  try {
    const csv = fs.readFileSync(targetsCsvPath, "utf8");
    res.type("text/csv").set("Cache-Control", "no-store").send(csv);
  } catch (error) {
    sendServerError(req, res, error, "qlik_targets_export_failed");
  }
});

router.get("/qlik/emissions.csv", async (req, res) => {
  if (isMockMode()) return res.status(503).json({ error: "qlik_export_unavailable_in_mock_mode" });
  try {
    const { since, to } = defaultInventoryRange();
    const dashboard = await getEmissionsDashboard(since, to);
    const csv = formatQlikEmissionsCsv(dashboard);
    res.type("text/csv").set("Cache-Control", "no-store").send(csv);
  } catch (error) {
    sendServerError(req, res, error, "qlik_emissions_export_failed");
  }
});

export default router;
