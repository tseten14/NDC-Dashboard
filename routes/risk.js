import express from "express";
import {
  HAZARD_LAYERS,
  RISK_DISTRICTS,
  RISK_CELLS,
  ADAPTATION_OPTIONS,
} from "../data/riskSeed.js";

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
