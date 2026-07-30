/**
 * Climate risk endpoints.
 *
 * Serves the data behind the risk screens: which hazards threaten which parts of
 * the country (drought, flood, landslide and so on), scored per district and per
 * map grid cell, together with the adaptation measures that can be chosen in
 * response. All of it is bundled reference data shipped with the app rather than
 * a live feed.
 *
 * Endpoints:
 *   GET /hazard-layers       — the hazard types that can be mapped
 *   GET /districts           — risk scores by district
 *   GET /cells               — risk scores by map grid cell
 *   GET /adaptation-options  — measures available in response to a hazard
 */
import express from "express";
import {
  HAZARD_LAYERS,
  RISK_DISTRICTS,
  RISK_CELLS,
  ADAPTATION_OPTIONS,
} from "../../data/seeds/riskSeed.js";

const router = express.Router();

router.get("/hazard-layers", (_req, res) => {
  res.json({ layers: HAZARD_LAYERS, data_source: "bundled (illustrative)" });
});

router.get("/districts", (_req, res) => {
  res.json({ districts: RISK_DISTRICTS, data_source: "bundled (illustrative)" });
});

router.get("/cells", (_req, res) => {
  res.json({ cells: RISK_CELLS, data_source: "bundled (illustrative)" });
});

router.get("/adaptation-options", (_req, res) => {
  res.json({ options: ADAPTATION_OPTIONS, data_source: "bundled (illustrative)" });
});

export default router;
