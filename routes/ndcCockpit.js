import express from "express";
import {
  getIndicatorPanel,
  getCatalogActivities,
  getCatalogMitigation,
} from "../services/indicatorCatalogData.js";
import { latestInventoryYear } from "../config/climateTrace.js";
import { safeParseOrLog } from "../shared/validate.js";
import { indicatorPanelResponseSchema } from "../shared/schemas/indicatorPanel.schema.js";
import { parseInventoryRange } from "../shared/queryParams.js";

const router = express.Router();

router.get("/indicators/panel", async (req, res) => {
  try {
    const range = parseInventoryRange(req.query, {
      defaultSince: 2015,
      defaultTo: latestInventoryYear(),
    });
    if (range.error) return res.status(400).json({ error: range.error });
    const { since, to } = range;
    const panel = await getIndicatorPanel(since, to);
    const payload = { since, to, targets: panel, data_source: "bundled catalog" };
    safeParseOrLog(indicatorPanelResponseSchema, payload, "indicators.panel");
    return res.json(payload);
  } catch (err) {
    req.log?.error({ err }, "indicators_panel_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/catalog/activities", async (req, res) => {
  try {
    const { targetId } = req.query;
    const rows = await getCatalogActivities(targetId || null);
    return res.json({ activities: rows, data_source: "bundled catalog" });
  } catch (err) {
    req.log?.error({ err }, "catalog_activities_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/catalog/mitigation-options", async (req, res) => {
  try {
    const { targetId, sectorId } = req.query;
    const rows = await getCatalogMitigation(targetId || null, sectorId || null);
    return res.json({ options: rows, data_source: "bundled catalog" });
  } catch (err) {
    req.log?.error({ err }, "catalog_mitigation_options_failed");
    return res.status(500).json({ error: err.message });
  }
});

export default router;
