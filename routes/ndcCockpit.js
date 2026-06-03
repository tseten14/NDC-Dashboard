import express from "express";
import {
  getIndicatorPanel,
  getCatalogActivities,
  getCatalogMitigation,
} from "../services/indicatorCatalogData.js";
import { safeParseOrLog } from "../shared/validate.js";
import { indicatorPanelResponseSchema } from "../shared/schemas/indicatorPanel.schema.js";

const router = express.Router();

router.get("/indicators/panel", async (req, res) => {
  try {
    const since = parseInt(req.query.since ?? "2015", 10);
    const to = parseInt(req.query.to ?? "2024", 10);
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
