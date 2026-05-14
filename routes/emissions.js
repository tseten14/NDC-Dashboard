import express from "express";
import {
  getTimeseries,
  getLatestValue,
  computeProgress,
  getSectorSummary,
} from "../services/emissionsData.js";
import { checkApiHealth } from "../services/climatetrace.js";
import { NDC_TARGETS } from "../config/ndcTargets.js";

const router = express.Router();

router.get("/emissions/timeseries", async (req, res) => {
  try {
    const { sector, since = "2015", to = "2023", geography = "national" } = req.query;
    if (!sector) return res.status(400).json({ error: "sector is required" });
    if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });

    const timeseries = await getTimeseries(sector, parseInt(since, 10), parseInt(to, 10));

    const body = {
      sector,
      unit: "MtCO2e",
      data_source: "Climate TRACE v6",
      data_license: "Creative Commons 4.0",
      geography: geography === "district" ? "national" : geography,
      timeseries,
    };
    if (geography === "district") body.district_unavailable = true;

    return res.json(body);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/progress", async (req, res) => {
  try {
    const { sector } = req.query;
    if (!sector) return res.status(400).json({ error: "sector is required" });
    if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });

    const latest = await getLatestValue(sector);
    const progress = computeProgress(latest?.value ?? null, sector);
    const target = NDC_TARGETS[sector];

    return res.json({
      sector,
      unit: "MtCO2e",
      label: target.label,
      condition: target.condition,
      baseline_year: target.baseline_year,
      baseline_value: target.baseline,
      target_year: target.target_year,
      target_value: target.target,
      latest_year: latest?.year ?? null,
      latest_value: latest?.value ?? null,
      progress_pct: progress?.progress_pct ?? null,
      status: progress?.status ?? "unknown",
      data_source: "Climate TRACE v6",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/summary", async (_req, res) => {
  try {
    const summary = await getSectorSummary();
    return res.json(summary);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.get("/provenance", (_req, res) => {
  return res.json({
    source_type: "Observed (Earth Observation + Remote Sensing)",
    data_source_name: "Climate TRACE",
    source_url: "https://climatetrace.org",
    data_license: "Creative Commons 4.0",
    methodology: "Satellite + remote sensing, peer-reviewed models",
    coverage_years: "2015–2024",
    mrv_owner: "Ministry of Water and Environment",
    qa_qc_status: "OK",
    validated: true,
    last_updated: new Date().toISOString().split("T")[0],
  });
});

router.get("/health/climatetrace", async (_req, res) => {
  try {
    const health = await checkApiHealth();
    const code = health.status === "ok" ? 200 : health.status === "degraded" ? 206 : 503;
    return res.status(code).json(health);
  } catch (err) {
    return res.status(503).json({ status: "down", error: err.message });
  }
});

export default router;
