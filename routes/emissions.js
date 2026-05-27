import express from "express";
import {
  getTimeseries,
  getSectorSummary,
  getEmissionsDashboard,
  progressFromTimeseries,
  getProvenancePayload,
} from "../services/emissionsData.js";
import { defaultInventoryRange } from "../config/climateTrace.js";
import { checkApiHealth } from "../services/climatetrace.js";
import { NDC_TARGETS } from "../config/ndcTargets.js";

const router = express.Router();

function parseRange(query) {
  const { since, to } = defaultInventoryRange();
  return {
    since: query.since != null ? parseInt(query.since, 10) : since,
    to: query.to != null ? parseInt(query.to, 10) : to,
  };
}

router.get("/emissions/dashboard", async (req, res) => {
  try {
    const { since, to } = parseRange(req.query);
    const dashboard = await getEmissionsDashboard(since, to);
    return res.json(dashboard);
  } catch (err) {
    req.log?.error({ err }, "emissions_dashboard_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/timeseries", async (req, res) => {
  try {
    const { since, to } = parseRange(req.query);
    const { sector, geography = "national" } = req.query;
    if (!sector) return res.status(400).json({ error: "sector is required" });
    if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });

    const timeseries = await getTimeseries(sector, since, to);

    const body = {
      sector,
      unit: "MtCO2e",
      data_source: "Climate TRACE v7",
      data_license: "Creative Commons 4.0",
      geography: geography === "district" ? "national" : geography,
      timeseries,
    };
    if (geography === "district") {
      body.district_unavailable = true;
      body.district_note =
        "District Climate TRACE data: GET /v7/sources?gadmId=<district> — not wired in this API yet.";
    }

    return res.json(body);
  } catch (err) {
    req.log?.error({ err }, "emissions_dashboard_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/progress", async (req, res) => {
  try {
    const { sector } = req.query;
    const { since, to } = parseRange(req.query);
    if (!sector) return res.status(400).json({ error: "sector is required" });
    if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });

    const series = await getTimeseries(sector, since, to);
    const progress = progressFromTimeseries(series, sector);
    const latest = series.length
      ? [...series].reverse().find((p) => p.value != null) ?? null
      : null;
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
      latest_value: latest?.value != null ? +latest.value : null,
      progress_pct: progress?.progress_pct ?? null,
      status: progress?.status ?? "unknown",
      data_source: "Climate TRACE v7",
    });
  } catch (err) {
    req.log?.error({ err }, "emissions_dashboard_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/summary", async (_req, res) => {
  try {
    const summary = await getSectorSummary();
    return res.json(summary);
  } catch (err) {
    req.log?.error({ err }, "emissions_dashboard_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/provenance", async (_req, res) => {
  try {
    const payload = await getProvenancePayload();
    return res.json(payload);
  } catch (err) {
    req.log?.error({ err }, "emissions_dashboard_failed");
    return res.status(500).json({ error: err.message });
  }
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
