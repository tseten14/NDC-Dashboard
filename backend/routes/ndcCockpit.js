/**
 * Endpoints for the decision-support "cockpit" screens.
 *
 * Supplies the three lists those screens are built from: the indicators being
 * tracked, the delivery activities on the ground, and the menu of mitigation
 * options (the measures a ministry could choose to fund). Responses are checked
 * against a schema before being sent, so a malformed payload fails here rather
 * than silently drawing a wrong chart.
 *
 * Endpoints:
 *   GET /indicators/panel            — indicators with their latest values
 *   GET /catalog/activities          — delivery activities
 *   GET /catalog/mitigation-options  — available mitigation measures
 */
import express from "express";
import { sendServerError } from "../server/errors.js";
import {
  getIndicatorPanel,
  getCatalogActivities,
  getCatalogMitigation,
} from "../services/indicatorCatalogData.js";
import { latestInventoryYear } from "../../config/climateTrace.js";
import { safeParseOrLog } from "../../shared/validate.js";
import { indicatorPanelResponseSchema } from "../../shared/schemas/indicatorPanel.schema.js";
import { parseInventoryRange } from "../../shared/queryParams.js";

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
    return sendServerError(req, res, err, "indicators_panel_failed");
  }
});

router.get("/catalog/activities", async (req, res) => {
  try {
    const { targetId } = req.query;
    const rows = await getCatalogActivities(targetId || null);
    return res.json({ activities: rows, data_source: "bundled catalog" });
  } catch (err) {
    return sendServerError(req, res, err, "catalog_activities_failed");
  }
});

router.get("/catalog/mitigation-options", async (req, res) => {
  try {
    const { targetId, sectorId } = req.query;
    const rows = await getCatalogMitigation(targetId || null, sectorId || null);
    return res.json({ options: rows, data_source: "bundled catalog" });
  } catch (err) {
    return sendServerError(req, res, err, "catalog_mitigation_options_failed");
  }
});

export default router;
