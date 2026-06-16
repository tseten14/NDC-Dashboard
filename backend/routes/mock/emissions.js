import express from "express";
import { NDC_TARGETS } from "../../../config/ndcTargets.js";

/**
 * Mock emissions API (stable fixtures). Always mounted at /api/v1/mock.
 * When USE_MOCK_DATA=true, the same router is also mounted at /api/v1.
 */
const router = express.Router();

function mockTimeseries(sector, since, to) {
  const out = [];
  for (let y = since; y <= to; y++) {
    const base = NDC_TARGETS[sector]?.baseline ?? 40;
    const t = (y - since) / Math.max(1, to - since);
    const value = +(base - t * (base * 0.15)).toFixed(2);
    out.push({ year: y, value: y % 5 === 0 ? null : value });
  }
  return out;
}

router.get("/emissions/timeseries", (req, res) => {
  const { sector, since = "2015", to = "2023", geography = "national" } = req.query;
  if (!sector) return res.status(400).json({ error: "sector is required" });
  if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });

  const body = {
    sector,
    unit: "MtCO2e",
    data_source: "MOCK",
    data_license: "Creative Commons 4.0",
    geography: geography === "district" ? "national" : geography,
    timeseries: mockTimeseries(sector, parseInt(since, 10), parseInt(to, 10)),
  };
  if (geography === "district") body.district_unavailable = true;
  res.json(body);
});

router.get("/emissions/progress", (req, res) => {
  const { sector } = req.query;
  if (!sector) return res.status(400).json({ error: "sector is required" });
  if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });
  const t = NDC_TARGETS[sector];
  res.json({
    sector,
    unit: "MtCO2e",
    label: t.label,
    condition: t.condition,
    baseline_year: t.baseline_year,
    baseline_value: t.baseline,
    target_year: t.target_year,
    target_value: t.target,
    latest_year: 2023,
    latest_value: +(t.baseline * 0.92).toFixed(2),
    progress_pct: 62,
    status: "mixed",
    data_source: "MOCK",
  });
});

router.get("/emissions/summary", (_req, res) => {
  res.json({
    on_track: 1,
    off_track: 1,
    mixed: 2,
    impl_gaps: 0,
    mrv_gaps: 1,
    global_rank: 80,
    total_co2e_mtco2e: 567.65,
    yoy_change_mtco2e: 10.17,
    data_stale: false,
    sectors: Object.fromEntries(
      Object.keys(NDC_TARGETS).map((s) => [
        s,
        { latest_year: 2023, latest_value: 30.0, status: "mixed", progress_pct: 55 },
      ]),
    ),
  });
});

router.get("/provenance", (_req, res) => {
  res.json({
    source_type: "MOCK",
    data_source_name: "Climate TRACE (mock)",
    source_url: "https://climatetrace.org",
    data_license: "Creative Commons 4.0",
    methodology: "Mock fixture for development",
    coverage_years: "2015–2024",
    mrv_owner: "Ministry of Water and Environment",
    qa_qc_status: "OK",
    validated: true,
    last_updated: new Date().toISOString().split("T")[0],
  });
});

router.get("/health/climatetrace", (_req, res) => {
  res.status(200).json({
    status: "ok",
    latency_ms: 12,
    http_status: 200,
    last_checked: new Date().toISOString(),
  });
});

export default router;
