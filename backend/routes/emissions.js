/**
 * Climate TRACE emissions routes for the NDC cockpit, map, predictions, and MRV helpers.
 * Geography: optional `gadm_id` or `district` query params (national default).
 * @see docs/dev/architecture.md and PROJECT_DOCUMENTATION.txt § B2
 */
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sendServerError } from "../server/errors.js";
import {
  getTimeseries,
  getSectorSummary,
  getEmissionsDashboard,
  progressFromTimeseries,
  getProvenancePayload,
} from "../services/emissionsData.js";
import { defaultInventoryRange, latestInventoryYear, TRACE_RELEASE } from "../../config/climateTrace.js";
import {
  parseInventoryRange,
  parseOptionalInventoryYear,
  parsePositiveInt,
} from "../../shared/queryParams.js";
import { SUBNATIONAL_INVENTORY_YEAR_MIN } from "../../config/ugandaDistrictGadm.js";
import { checkApiHealth, getSources, getSpatialConfidence, getEmissionSourcesForMap } from "../services/climatetrace.js";
import { getPolygonInsights } from "../services/polygonInsights.js";
import { classificationCatalog, getCachedClassificationSeries } from "../services/classificationSeries.js";
import { getCachedTranslatorReconciliation } from "../services/translator/reconciliation.js";
import { classificationMapping } from "../../config/classificationMappings.js";
import { getTranslatorSources, TRACE_PROVIDER, TRANSLATOR_YEARS, DEFAULT_TRANSLATOR_YEAR } from "../services/translator/climateTrace.js";
import { BOUNDARY_PROVENANCE } from "../services/translator/geometry.js";
import { getSectorPredictions } from "../services/predictionEngine.js";
import { NDC_TARGETS } from "../../config/ndcTargets.js";
import {
  UGANDA_NATIONAL_GADM,
  resolveDistrictGadm,
  getDistrictName,
  listDistricts,
} from "../../config/ugandaDistrictGadm.js";
import { COUNTRY_NDC_TARGETS, MEASURABLE_VARIABLES, listMeasurementTypes } from "../../config/measurableVariables.js";

const router = express.Router();
const translatorDistrictDisplay = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../services/translator/uganda-districts-display.geojson"), "utf8");

/**
 * Resolve a sector name supplied by the caller.
 *
 * Reading `NDC_TARGETS[sector]` directly looks like an allow-list check but is
 * not one: every JavaScript object inherits properties such as "constructor"
 * and "toString", so `?sector=constructor` returned a truthy value and sailed
 * past the "unknown sector" guard into code expecting a target definition.
 * Asking whether the object *itself* defines the key closes that, and requiring
 * a plain string first rejects `?sector=a&sector=b`, which Express delivers as
 * an array.
 */
function resolveSector(raw) {
  if (typeof raw !== "string" || !Object.prototype.hasOwnProperty.call(NDC_TARGETS, raw)) {
    return null;
  }
  return raw;
}

function parseRange(query, gadmId = UGANDA_NATIONAL_GADM) {
  const { since, to } = defaultInventoryRange();
  const minYear =
    gadmId !== UGANDA_NATIONAL_GADM ? SUBNATIONAL_INVENTORY_YEAR_MIN : since;
  return parseInventoryRange(query, { defaultSince: minYear, defaultTo: to });
}

function parseYearQuery(query, gadmId = UGANDA_NATIONAL_GADM) {
  const minYear =
    gadmId !== UGANDA_NATIONAL_GADM ? SUBNATIONAL_INVENTORY_YEAR_MIN : undefined;
  return parseOptionalInventoryYear(query.year, latestInventoryYear(), { minYear });
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

router.get("/emissions/districts", (req, res) => {
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
    measurement_types: listMeasurementTypes(),
    available_countries: Object.keys(COUNTRY_NDC_TARGETS),
    data_source: "Climate TRACE",
    note: "Targets are tracked from Climate TRACE where 'trackable' is true; other variables need national / EO statistics.",
  });
});

router.get("/emissions/sources", async (req, res) => {
  try {
    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });

    const yearResult = parseYearQuery(req.query, geo.gadmId);
    if (yearResult.error) return res.status(400).json({ error: yearResult.error });
    const year = yearResult.value;
    const limit = parsePositiveInt(req.query.limit, 25, { max: 200 });
    const offset = parsePositiveInt(req.query.offset, 0);
    if (limit == null || offset == null) {
      return res.status(400).json({ error: "limit and offset must be non-negative integers" });
    }
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
    return sendServerError(req, res, err, "emissions_sources_failed");
  }
});

router.get("/emissions/spatial-confidence", async (req, res) => {
  try {
    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const yearResult = parseYearQuery(req.query, geo.gadmId);
    if (yearResult.error) return res.status(400).json({ error: yearResult.error });
    const year = yearResult.value;
    const result = await getSpatialConfidence({ gadmId: geo.gadmId, year });
    const isDistrict = geo.gadmId !== UGANDA_NATIONAL_GADM;
    return res.json({
      ...result,
      geography: isDistrict ? "district" : "national",
      district_name: geo.districtName,
      data_source: "Climate TRACE",
      data_license: "Creative Commons 4.0",
      methodology:
        "Located = emissions attributed to known sources (assets + mapped forestry, buildings, agriculture, roads). " +
        "Distributed = the country's spatially-uncertain emissions (SUEs) allocated to this area using statistical proxies " +
        "(population, nightlights, land use). Higher located share = higher spatial certainty.",
      methodology_url:
        "https://github.com/climatetracecoalition/methodology-documents",
    });
  } catch (err) {
    return sendServerError(req, res, err, "emissions_spatial_confidence_failed");
  }
});

router.get("/emissions/map", async (req, res) => {
  try {
    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const yearResult = parseYearQuery(req.query, geo.gadmId);
    if (yearResult.error) return res.status(400).json({ error: yearResult.error });
    const year = yearResult.value;
    const result = await getEmissionSourcesForMap({ gadmId: geo.gadmId, year });
    const isDistrict = geo.gadmId !== UGANDA_NATIONAL_GADM;
    return res.json({
      ...result,
      geography: isDistrict ? "district" : "national",
      district_name: geo.districtName,
      data_source: "Climate TRACE",
      data_license: "Creative Commons 4.0",
      note: "Each point is a geolocated emission source (asset-level facility or GADM sub-area aggregation) with its Climate TRACE centroid.",
    });
  } catch (err) {
    return sendServerError(req, res, err, "emissions_map_failed");
  }
});

router.get("/emissions/translator/metadata", (_req, res) => {
  res.json({ years: TRANSLATOR_YEARS, default_year: DEFAULT_TRANSLATOR_YEAR, providers: [TRACE_PROVIDER], boundary: BOUNDARY_PROVENANCE });
});

router.get("/emissions/translator/districts", (_req, res) => {
  res.type("application/geo+json").send(translatorDistrictDisplay);
});

router.get("/emissions/translator/sources", async (req, res) => {
  const year = Number(req.query.year);
  if (!TRANSLATOR_YEARS.includes(year)) return res.status(400).json({ error: "unsupported_year" });
  try { return res.json(await getTranslatorSources(year)); }
  catch (err) { return sendServerError(req, res, err, "translator_sources_failed"); }
});

router.get("/emissions/translator/reconciliation", async (req, res) => {
  const year = req.query.year;
  if (typeof year !== "string" || !/^\d{4}$/.test(year) || Number(year) < 2021 || Number(year) > latestInventoryYear()) {
    return res.status(400).json({ error: "unsupported_complete_year" });
  }
  try { return res.json(await getCachedTranslatorReconciliation(Number(year))); }
  catch (err) { return sendServerError(req, res, err, "translator_reconciliation_failed", { status: 502, code: "climate_trace_unavailable" }); }
});

router.get("/emissions/classification/catalog", (_req, res) => res.json(classificationCatalog()));

router.get("/emissions/classification/series", async (req, res) => {
  const code = req.query.code;
  if (!classificationMapping(code)) return res.status(400).json({ error: "unknown_category" });
  const sinceRaw = req.query.since ?? "2021";
  const toRaw = req.query.to ?? String(latestInventoryYear());
  const maxYear = Number(TRACE_RELEASE.data_through.slice(0, 4));
  if (typeof sinceRaw !== "string" || typeof toRaw !== "string" || !/^\d{4}$/.test(sinceRaw) || !/^\d{4}$/.test(toRaw)) {
    return res.status(400).json({ error: "invalid_year_range" });
  }
  const since = Number(sinceRaw);
  const to = Number(toRaw);
  if (since < 2015 || to > maxYear || since > to || to - since > 11) return res.status(400).json({ error: "invalid_year_range" });
  try { return res.json(await getCachedClassificationSeries(code, since, to)); }
  catch (err) { return sendServerError(req, res, err, "classification_series_failed", { status: 502, code: "climate_trace_unavailable" }); }
});

router.post("/emissions/polygon-insights", async (req, res) => {
  try {
    const result = await getPolygonInsights({ geometry: req.body?.geometry, year: req.body?.year, sectors: req.body?.sectors, selectionKind: req.body?.selection_kind ?? "custom", districtId: req.body?.district_id });
    if (result.error) return res.status(400).json({ error: result.error });
    return res.json(result);
  } catch (err) {
    return sendServerError(req, res, err, "polygon_insights_failed");
  }
});

router.get("/emissions/predictions", async (req, res) => {
  const geo = resolveGeography(req.query);
  if (geo.error) return res.status(geo.status).json({ error: geo.error });
  try {
    const result = await getSectorPredictions({
      gadmId: geo.gadmId,
      districtName: geo.districtName,
    });
    return res.json(result);
  } catch (err) {
    req.log?.error({ err }, "emissions_predictions_failed");
    return res.status(502).json({ error: "prediction_failed" });
  }
});

router.get("/emissions/dashboard", async (req, res) => {
  try {
    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const range = parseRange(req.query, geo.gadmId);
    if (range.error) return res.status(400).json({ error: range.error });
    const dashboard = await getEmissionsDashboard(range.since, range.to, {
      gadmId: geo.gadmId,
      districtName: geo.districtName,
    });
    return res.json(dashboard);
  } catch (err) {
    return sendServerError(req, res, err, "emissions_dashboard_failed");
  }
});

router.get("/emissions/timeseries", async (req, res) => {
  try {
    const sector = resolveSector(req.query.sector);
    if (!sector) {
      return res.status(400).json({
        error: "unknown_sector",
        message: `sector must be one of: ${Object.keys(NDC_TARGETS).join(", ")}`,
      });
    }

    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const range = parseRange(req.query, geo.gadmId);
    if (range.error) return res.status(400).json({ error: range.error });

    const timeseries = await getTimeseries(sector, range.since, range.to, geo.gadmId);
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
    return sendServerError(req, res, err, "emissions_timeseries_failed");
  }
});

router.get("/emissions/progress", async (req, res) => {
  try {
    const sector = resolveSector(req.query.sector);
    if (!sector) {
      return res.status(400).json({
        error: "unknown_sector",
        message: `sector must be one of: ${Object.keys(NDC_TARGETS).join(", ")}`,
      });
    }

    const geo = resolveGeography(req.query);
    if (geo.error) return res.status(geo.status).json({ error: geo.error });
    const range = parseRange(req.query, geo.gadmId);
    if (range.error) return res.status(400).json({ error: range.error });
    const isDistrict = geo.gadmId !== UGANDA_NATIONAL_GADM;

    const series = await getTimeseries(sector, range.since, range.to, geo.gadmId);
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
      progress_method: progress?.progress_method ?? null,
      bau_2030: target.bau_2030 ?? null,
      data_source: "Climate TRACE",
      geography: isDistrict ? "district" : "national",
      gadm_id: geo.gadmId,
      district_name: geo.districtName,
      target_scope: "national",
    });
  } catch (err) {
    return sendServerError(req, res, err, "emissions_progress_failed");
  }
});

router.get("/emissions/summary", async (req, res) => {
  try {
    const summary = await getSectorSummary();
    return res.json(summary);
  } catch (err) {
    return sendServerError(req, res, err, "emissions_summary_failed");
  }
});

router.get("/provenance", async (req, res) => {
  try {
    const payload = await getProvenancePayload();
    return res.json(payload);
  } catch (err) {
    return sendServerError(req, res, err, "provenance_failed");
  }
});

router.get("/health/climatetrace", async (req, res) => {
  try {
    const health = await checkApiHealth();
    const code = health.status === "ok" ? 200 : health.status === "degraded" ? 206 : 503;
    return res.status(code).json(health);
  } catch (err) {
    // The upstream error text embeds the full Climate TRACE request URL. That
    // is internal detail about how this server calls out, so it is logged
    // rather than returned.
    req.log?.error({ err, event: "climatetrace_health_failed" }, "climate trace health check failed");
    return res.status(503).json({ status: "down" });
  }
});

export default router;
