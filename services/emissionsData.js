import { NDC_TARGETS } from "../config/ndcTargets.js";
import {
  CLIMATE_TRACE_DOCS_URL,
  defaultInventoryRange,
  latestInventoryYear,
} from "../config/climateTrace.js";
import { fetchLiveUgandaSnapshot } from "./climatetrace.js";
import { getUiSectorTimeseries, warmSlugYears } from "./climateTraceTimeseries.js";

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

export function computeProgress(latestValue, sector) {
  const t = NDC_TARGETS[sector];
  if (!t || latestValue == null) return null;

  const denom = t.baseline - t.target;
  if (!Number.isFinite(denom) || denom === 0) return null;

  const pct = ((t.baseline - latestValue) / denom) * 100;
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  return {
    baseline_year: t.baseline_year,
    baseline_value: t.baseline,
    target_year: t.target_year,
    target_value: t.target,
    latest_value: latestValue,
    progress_pct: clamped,
    status: clamped >= 80 ? "on_track" : clamped >= 50 ? "mixed" : "off_track",
  };
}

export function progressFromTimeseries(series, sector) {
  const latest = latestFromSeries(series);
  return computeProgress(latest?.value ?? null, sector);
}

/**
 * Full dashboard payload — one round-trip warms cache for all sectors.
 */
export async function getEmissionsDashboard(since, to) {
  const range = defaultInventoryRange();
  const sinceY = since ?? range.since;
  const toY = to ?? range.to;

  await warmSlugYears(sinceY, toY);

  const timeseries = {};
  const progress = {};
  const sectors = {};

  await Promise.all(
    SECTOR_KEYS.map(async (sector) => {
      const series = await getUiSectorTimeseries(sector, sinceY, toY);
      const t = NDC_TARGETS[sector];
      timeseries[sector] = series;
      const latest = latestFromSeries(series);
      const prog = computeProgress(latest?.value ?? null, sector);
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

  return {
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
  };
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
  };
}
