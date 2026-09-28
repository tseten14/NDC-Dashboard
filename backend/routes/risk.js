/**
 * Climate risk endpoints.
 *
 * Serves the data behind the risk screens: which hazards threaten which parts of
 * the country (drought, flood, landslide and so on), scored per district and per
 * map grid cell, together with the adaptation measures that can be chosen in
 * response. No verified provider is connected yet; empty collections explicitly
 * report unavailable data rather than returning demonstration values.
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
const provenance = {
  data_source: null,
  data_status: "unavailable",
  message: "No verified climate risk dataset is connected. Risk scores and adaptation costs are unavailable.",
};

router.get("/hazard-layers", (_req, res) => {
  res.json({ layers: HAZARD_LAYERS, ...provenance });
});

router.get("/districts", (_req, res) => {
  res.json({ districts: RISK_DISTRICTS, ...provenance });
});

router.get("/cells", (_req, res) => {
  res.json({ cells: RISK_CELLS, ...provenance });
});

router.get("/adaptation-options", (_req, res) => {
  res.json({ options: ADAPTATION_OPTIONS, ...provenance });
});

export default router;
