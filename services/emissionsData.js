import {
  NDC_TARGETS,
  SECTOR_MAP,
  SECTOR_SCOPE_NOTES,
  ALL_TRACE_SLUGS,
  UNMAPPED_SECTOR_SLUGS,
} from "../config/ndcTargets.js";
import {
  CLIMATE_TRACE_DOCS_URL,
  defaultInventoryRange,
  latestInventoryYear,
} from "../config/climateTrace.js";
import { fetchLiveUgandaSnapshot } from "./climatetrace.js";
import {
  getUiSectorTimeseries,
  warmSlugYears,
  getSlugBreakdownForYear,
  getMissingSlugsForSectorYear,
} from "./climateTraceTimeseries.js";
import { computeSectorProgress } from "../shared/progress.js";
import { safeParseOrLog } from "../shared/validate.js";
import { emissionsDashboardSchema } from "../shared/schemas/emissionsDashboard.schema.js";
import { logReconciliationDelta } from "../server/logger.js";

const SECTOR_KEYS = Object.keys(NDC_TARGETS);

function num(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? +n.toFixed(2) : null;
}

export function latestFromSeries(series) {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value != null) {
      return { year: series[i].year, value: num(series[i].value) };
    }
  }
  return null;
}

function priorFromSeries(series, beforeYear) {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].year < beforeYear && series[i].value != null) {
      return { year: series[i].year, value: num(series[i].value) };
    }
  }
  return null;
}

function traceYoYPct(series, latestYear, latestValue) {
  if (latestValue == null || latestYear == null) return null;
  const prior = priorFromSeries(series, latestYear);
  if (!prior?.value || prior.value === 0) return null;
  return +(((latestValue - prior.value) / prior.value) * 100).toFixed(1);
}

/**
 * Timeseries from Climate TRACE v7 (cached); null for missing years — no interpolation.
 */
export async function getTimeseries(sector, since, to) {
  if (!NDC_TARGETS[sector]) {
    throw new Error(`Unknown sector: ${sector}. Valid: ${SECTOR_KEYS.join(", ")}`);
  }
  const range = defaultInventoryRange();
  const sinceY = since ?? range.since;
  const toY = to ?? range.to;
  return getUiSectorTimeseries(sector, sinceY, toY);
}

export function computeProgress(latestValue, sector, latestYear = null) {
  const t = NDC_TARGETS[sector];
  if (!t) return null;
  return computeSectorProgress(latestValue, t, latestYear);
}

export function progressFromTimeseries(series, sector) {
  const latest = latestFromSeries(series);
  return computeProgress(latest?.value ?? null, sector, latest?.year ?? null);
}

async function buildReconciliation(refYear, countryTotalMt) {
  const { breakdown, missing_slugs } = await getSlugBreakdownForYear(refYear);
  const slugValues = ALL_TRACE_SLUGS.map((s) => breakdown[s]).filter((v) => v != null);
  const allSlugsPresent = slugValues.length === ALL_TRACE_SLUGS.length;
  const sector_sum_mt = allSlugsPresent
    ? +slugValues.reduce((a, b) => a + b, 0).toFixed(2)
    : null;

  const uiValues = SECTOR_KEYS.map((sector) => {
    const slugs = SECTOR_MAP[sector];
    const parts = slugs.map((s) => breakdown[s]);
    if (parts.some((v) => v == null)) return null;
    return +parts.reduce((a, b) => a + b, 0).toFixed(2);
  }).filter((v) => v != null);
  const ui_sector_sum_mt =
    uiValues.length === SECTOR_KEYS.length
      ? +uiValues.reduce((a, b) => a + b, 0).toFixed(2)
      : null;

  const country_total_mt = countryTotalMt != null ? num(countryTotalMt) : null;
  let delta_mt = null;
  if (country_total_mt != null && sector_sum_mt != null) {
    delta_mt = +(country_total_mt - sector_sum_mt).toFixed(2);
  }

  const delta_pct =
    delta_mt != null && sector_sum_mt != null && sector_sum_mt !== 0
      ? +Math.abs((delta_mt / sector_sum_mt) * 100).toFixed(2)
      : null;

  logReconciliationDelta({
    target_id: "national",
    delta_pct,
    reference_year: refYear,
  });

  return {
    reference_year: refYear,
    country_total_mt,
    sector_sum_mt,
    ui_sector_sum_mt,
    delta_mt,
    unmapped_slugs: UNMAPPED_SECTOR_SLUGS,
    missing_slugs,
    slug_breakdown: breakdown,
    note:
      "country_total from rankings; sector_sum is all 9 TRACE slugs; ui_sector_sum excludes mineral-extraction and uses NDC buckets.",
  };
}

/**
 * Full dashboard payload — one round-trip warms cache for all sectors.
 */
export async function getEmissionsDashboard(since, to) {
  const range = defaultInventoryRange();
  const sinceY = since ?? range.since;
  const toY = to ?? range.to;
  const refYear = Math.min(toY, latestInventoryYear());

  await warmSlugYears(sinceY, toY);

  const timeseries = {};
  const progress = {};
  const sectors = {};
  const slug_breakdown_by_sector = {};

  await Promise.all(
    SECTOR_KEYS.map(async (sector) => {
      const series = await getUiSectorTimeseries(sector, sinceY, toY);
      const t = NDC_TARGETS[sector];
      timeseries[sector] = series;
      const latest = latestFromSeries(series);
      const prog = computeProgress(latest?.value ?? null, sector, latest?.year ?? null);
      const missingSlugs =
        latest?.year != null ? await getMissingSlugsForSectorYear(sector, latest.year) : [];

      const slugParts = {};
      if (latest?.year != null && SECTOR_MAP[sector]) {
        const { breakdown } = await getSlugBreakdownForYear(latest.year);
        for (const slug of SECTOR_MAP[sector]) {
          slugParts[slug] = breakdown[slug] ?? null;
        }
      }

      slug_breakdown_by_sector[sector] = {
        reference_year: latest?.year ?? refYear,
        slugs: SECTOR_MAP[sector] ?? [],
        values_mt: slugParts,
        missing_slugs: missingSlugs,
      };

      const trace_yoy_pct = traceYoYPct(series, latest?.year ?? null, latest?.value ?? null);

      progress[sector] = {
        sector,
        unit: "MtCO2e",
        label: t.label,
        condition: t.condition,
        baseline_year: t.baseline_year,
        baseline_value: t.baseline,
        target_year: t.target_year,
        target_value: t.target,
        latest_year: latest?.year ?? null,
        latest_value: latest?.value ?? null,
        progress_pct: prog?.progress_pct ?? null,
        status: prog?.status ?? "unknown",
        data_source: "Climate TRACE v7",
        methodology: "ndc_baseline_vs_trace_observed",
        scope_note: SECTOR_SCOPE_NOTES[sector] ?? null,
        trace_yoy_pct,
        baseline_vs_trace_delta_mt:
          latest?.value != null ? +(latest.value - t.baseline).toFixed(2) : null,
        missing_slugs: missingSlugs,
      };
      sectors[sector] = {
        latest_year: latest?.year ?? null,
        latest_value: latest?.value ?? null,
        status: prog?.status ?? "unknown",
        progress_pct: prog?.progress_pct ?? null,
      };
    }),
  );

  let on_track = 0;
  let off_track = 0;
  let mixed = 0;
  for (const sector of SECTOR_KEYS) {
    const st = sectors[sector].status;
    if (st === "on_track") on_track++;
    else if (st === "off_track") off_track++;
    else if (st === "mixed") mixed++;
  }

  let live;
  try {
    live = await fetchLiveUgandaSnapshot();
  } catch (e) {
    live = { co2e_mtco2e: null, rank: null, yoy_change_mtco2e: null, stale: true, error: e.message };
  }

  const reconciliation = await buildReconciliation(refYear, live.co2e_mtco2e);

  const payload = {
    since: sinceY,
    to: toY,
    inventory_year: latestInventoryYear(),
    on_track,
    off_track,
    mixed,
    impl_gaps: 0,
    mrv_gaps: 1,
    global_rank: live.rank,
    total_co2e_mtco2e: live.co2e_mtco2e,
    yoy_change_mtco2e: live.yoy_change_mtco2e,
    data_stale: !!live.stale,
    from_cache: !!live.from_cache,
    data_source: "Climate TRACE v7 (live API)",
    api_docs_url: CLIMATE_TRACE_DOCS_URL,
    timeseries,
    progress,
    sectors,
    slug_breakdown_by_sector,
    reconciliation,
    coverage: {
      methodology:
        "Observed emissions from Climate TRACE v7 (co2e_100yr) compared to Uganda NDC policy baselines — not official MRV.",
      sector_scope_notes: SECTOR_SCOPE_NOTES,
      unmapped_slugs: UNMAPPED_SECTOR_SLUGS,
    },
  };

  safeParseOrLog(emissionsDashboardSchema, payload, "emissions.dashboard");
  return payload;
}

/** @deprecated Prefer getEmissionsDashboard — kept for single-sector routes */
export async function getLatestValue(sector) {
  const range = defaultInventoryRange();
  const series = await getTimeseries(sector, range.since, range.to);
  return latestFromSeries(series);
}

export async function getSectorSummary() {
  const d = await getEmissionsDashboard();
  return {
    on_track: d.on_track,
    off_track: d.off_track,
    mixed: d.mixed,
    impl_gaps: d.impl_gaps,
    mrv_gaps: d.mrv_gaps,
    global_rank: d.global_rank,
    total_co2e_mtco2e: d.total_co2e_mtco2e,
    yoy_change_mtco2e: d.yoy_change_mtco2e,
    data_stale: d.data_stale,
    from_cache: d.from_cache,
    data_source: d.data_source,
    api_docs_url: d.api_docs_url,
    sectors: d.sectors,
    reconciliation: d.reconciliation,
  };
}

function reconciliationDeltaPct(reconciliation) {
  const delta = reconciliation?.delta_mt;
  const ref = reconciliation?.sector_sum_mt;
  if (delta == null || ref == null || ref === 0) return null;
  return Math.abs((delta / ref) * 100);
}

export async function getProvenancePayload() {
  const range = defaultInventoryRange();
  let reconciliation = null;
  let dataStale = false;
  try {
    const dash = await getEmissionsDashboard(range.since, range.to);
    reconciliation = dash.reconciliation;
    dataStale = !!dash.data_stale;
  } catch {
    /* best-effort */
  }

  const missingSlugs = reconciliation?.missing_slugs?.length ?? 0;
  const deltaPct = reconciliationDeltaPct(reconciliation);
  let validated = !dataStale && missingSlugs === 0 && (deltaPct == null || deltaPct <= 5);
  let qa_qc_status = "OK";
  if (missingSlugs > 0 || dataStale) {
    validated = false;
    qa_qc_status = "Warning";
  }
  if (deltaPct != null && deltaPct > 5) {
    validated = false;
    qa_qc_status = "Inconsistent";
  }

  return {
    source_type: "Observed (Earth Observation + Remote Sensing)",
    data_source_name: "Climate TRACE",
    api_version: "v7",
    source_url: "https://climatetrace.org",
    api_docs_url: CLIMATE_TRACE_DOCS_URL,
    data_license: "Creative Commons 4.0",
    methodology: "Satellite + remote sensing, peer-reviewed models",
    ndc_comparison_methodology: "ndc_baseline_vs_trace_observed",
    coverage_years: `${range.since}–${range.to} (national via /v7/sources/emissions; district via /v7/sources + GADM2)`,
    mrv_owner: "Ministry of Water and Environment",
    qa_qc_status,
    validated,
    last_updated: new Date().toISOString().split("T")[0],
    sector_scope_notes: SECTOR_SCOPE_NOTES,
    unmapped_slugs: UNMAPPED_SECTOR_SLUGS,
    reconciliation,
  };
}
