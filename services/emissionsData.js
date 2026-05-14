import { NDC_TARGETS, SLUG_TO_UI_SECTOR } from "../config/ndcTargets.js";
import { fetchLiveUgandaSnapshot } from "./climatetrace.js";
import { getSupabaseAdmin } from "./supabaseAdmin.js";

function num(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? +n.toFixed(2) : null;
}

/**
 * Timeseries from DB; null for missing years (no interpolation).
 */
export async function getTimeseries(sector, since = 2015, to = 2023) {
  if (!NDC_TARGETS[sector]) {
    throw new Error(`Unknown sector: ${sector}. Valid: ${Object.keys(NDC_TARGETS).join(", ")}`);
  }

  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("climatetrace_emissions")
    .select("year, co2e_mtco2e")
    .eq("country", "UGA")
    .eq("sector", sector)
    .gte("year", since)
    .lte("year", to)
    .order("year", { ascending: true });

  if (error) throw new Error(error.message);

  const byYear = new Map((rows ?? []).map((r) => [r.year, num(r.co2e_mtco2e)]));
  const result = [];
  for (let y = since; y <= to; y++) {
    result.push({ year: y, value: byYear.has(y) ? byYear.get(y) : null });
  }
  return result;
}

export async function getLatestValue(sector) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("climatetrace_emissions")
    .select("year, co2e_mtco2e")
    .eq("country", "UGA")
    .eq("sector", sector)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { year: data.year, value: num(data.co2e_mtco2e) };
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

export async function getSectorSummary() {
  const sectors = Object.keys(NDC_TARGETS);
  const results = {};
  let on_track = 0;
  let off_track = 0;
  let mixed = 0;

  for (const sector of sectors) {
    const latest = await getLatestValue(sector);
    const progress = computeProgress(latest?.value ?? null, sector);
    results[sector] = {
      latest_year: latest?.year ?? null,
      latest_value: latest?.value ?? null,
      status: progress?.status ?? "unknown",
      progress_pct: progress?.progress_pct ?? null,
    };
    if (progress?.status === "on_track") on_track++;
    else if (progress?.status === "off_track") off_track++;
    else if (progress?.status === "mixed") mixed++;
  }

  let live;
  try {
    live = await fetchLiveUgandaSnapshot();
  } catch (e) {
    live = { co2e_mtco2e: null, rank: null, yoy_change_mtco2e: null, stale: true, error: e.message };
  }

  return {
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
    sectors: results,
  };
}
