import express from "express";
import {
  getTimeseries,
  getSectorSummary,
  getEmissionsDashboard,
  progressFromTimeseries,
  getProvenancePayload,
} from "../services/emissionsData.js";
import { defaultInventoryRange, latestInventoryYear } from "../config/climateTrace.js";
import { checkApiHealth, getSources } from "../services/climatetrace.js";
import { NDC_TARGETS } from "../config/ndcTargets.js";
import {
  UGANDA_NATIONAL_GADM,
  resolveDistrictGadm,
  getDistrictName,
  listDistricts,
} from "../config/ugandaDistrictGadm.js";
import { COUNTRY_NDC_TARGETS, MEASURABLE_VARIABLES } from "../config/measurableVariables.js";

const router = express.Router();

function parseRange(query) {
  const { since, to } = defaultInventoryRange();
  return {
    since: query.since != null ? parseInt(query.since, 10) : since,
    to: query.to != null ? parseInt(query.to, 10) : to,
  };
}

/**
 * Resolve the requested geography from query params.
 * Accepts `gadm_id` (e.g. UGA.16_1) or `district` (display name).
 * Returns { gadmId, districtName } for national or a mapped district,
 * or { error, status } when an explicit district cannot be resolved.
 */
function resolveGeography(query) {
  const raw = query.gadm_id ?? query.district ?? query.geography;
  if (raw == null || raw === "" || raw === "national" || raw === UGANDA_NATIONAL_GADM) {
    return { gadmId: UGANDA_NATIONAL_GADM, districtName: null };
  }
  const gadmId = resolveDistrictGadm(raw);
  if (!gadmId) {
    return {
      error: `Unknown or unmapped district: "${raw}". See GET /api/v1/emissions/districts.`,
      status: 404,
    };
  }
  return { gadmId, districtName: getDistrictName(gadmId) };
}

router.get("/emissions/districts", (_req, res) => {
  return res.json({
    national: { gadm_id: UGANDA_NATIONAL_GADM, name: "Uganda (national)" },
    districts: listDistricts(),
    data_source: "Climate TRACE",
    note: "District (GADM level-1) emissions are available from 2021; national from 2015.",
  });
});

router.get("/emissions/trackability", (req, res) => {
  const country = String(req.query.country ?? "UGA").toUpperCase();
  const entry = COUNTRY_NDC_TARGETS[country];
  if (!entry) {
    return res.status(404).json({
      error: `No NDC targets registered for country: "${country}". Available: ${Object.keys(COUNTRY_NDC_TARGETS).join(", ")}.`,
    });
  }
  const variables = Object.values(MEASURABLE_VARIABLES).map((v) => ({
    id: v.id,
    label: v.label,
    description: v.description,
    measurement_type: v.measurement_type,
    unit: v.unit,
    trackable: Boolean(v.climate_trace?.trackable),
    sector_slugs: v.climate_trace?.sector_slugs ?? [],
    note: v.climate_trace?.note ?? null,
  }));
  return res.json({
    ...entry,
    targets: Object.values(entry.targets),
    variables,
    available_countries: Object.keys(COUNTRY_NDC_TARGETS),
    data_source: "Climate TRACE",
    note: "Targets are tracked from Climate TRACE where 'trackable' is true; other variables need national / EO statistics.",
  });
});

router.get("/emissions/sources", async (req, res) => {
  try {
    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });

    const year = req.query.year != null ? parseInt(req.query.year, 10) : latestInventoryYear();
    const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : 25;
    const offset = req.query.offset != null ? parseInt(req.query.offset, 10) : 0;
    const subsectors = typeof req.query.subsectors === "string" ? req.query.subsectors : "";

    const result = await getSources({ gadmId: geo.gadmId, year, subsectors, limit, offset });
    const isDistrict = geo.gadmId !== UGANDA_NATIONAL_GADM;

    return res.json({
      ...result,
      geography: isDistrict ? "district" : "national",
      district_name: geo.districtName,
      data_source: "Climate TRACE",
      data_license: "Creative Commons 4.0",
      note: "Source-level rows mix individual assets and GADM aggregations (forestry, buildings, agriculture, roads), sorted by emissions.",
    });
  } catch (err) {
    req.log?.error({ err }, "emissions_sources_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/dashboard", async (req, res) => {
  try {
    const { since, to } = parseRange(req.query);
    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const dashboard = await getEmissionsDashboard(since, to, {
      gadmId: geo.gadmId,
      districtName: geo.districtName,
    });
    return res.json(dashboard);
  } catch (err) {
    req.log?.error({ err }, "emissions_dashboard_failed");
    return res.status(500).json({ error: err.message });
  }
});

router.get("/emissions/timeseries", async (req, res) => {
  try {
    const { since, to } = parseRange(req.query);
    const { sector } = req.query;
    if (!sector) return res.status(400).json({ error: "sector is required" });
    if (!NDC_TARGETS[sector]) return res.status(400).json({ error: `Unknown sector: ${sector}` });

    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });

    const timeseries = await getTimeseries(sector, since, to, geo.gadmId);
    const isDistrict = geo.gadmId !== UGANDA_NATIONAL_GADM;

    return res.json({
      sector,
      unit: "MtCO2e",
      data_source: "Climate TRACE",
      data_license: "Creative Commons 4.0",
      geography: isDistrict ? "district" : "national",
      gadm_id: geo.gadmId,
      district_name: geo.districtName,
      timeseries,
    });
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

    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const isDistrict = geo.gadmId !== UGANDA_NATIONAL_GADM;

    const series = await getTimeseries(sector, since, to, geo.gadmId);
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
      progress_pct: isDistrict ? null : progress?.progress_pct ?? null,
      status: isDistrict ? "unknown" : progress?.status ?? "unknown",
      data_source: "Climate TRACE",
      geography: isDistrict ? "district" : "national",
      gadm_id: geo.gadmId,
      district_name: geo.districtName,
      target_scope: "national",
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
