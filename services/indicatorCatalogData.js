import { getSupabaseAdmin } from "./supabaseAdmin.js";

function num(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? +n.toFixed(4) : null;
}

/**
 * Panel payload for non-MtCO₂e targets (t2, t3, t5, t8) keyed by target_id.
 */
export async function getIndicatorPanel(since = 2015, to = 2024) {
  const supabase = getSupabaseAdmin();
  const { data: metaRows, error: e1 } = await supabase.from("ndc_indicator_meta").select("*");
  if (e1) throw new Error(e1.message);
  const { data: yearlyRows, error: e2 } = await supabase
    .from("ndc_indicator_yearly")
    .select("target_id, year, value")
    .gte("year", since)
    .lte("year", to)
    .order("year", { ascending: true });
  if (e2) throw new Error(e2.message);

  const byTarget = {};
  for (const row of yearlyRows ?? []) {
    if (!byTarget[row.target_id]) byTarget[row.target_id] = [];
    byTarget[row.target_id].push({ year: row.year, value: num(row.value) });
  }

  const out = {};
  for (const m of metaRows ?? []) {
    out[m.target_id] = {
      meta: {
        targetId: m.target_id,
        baselineYear: m.baseline_year,
        baselineValue: num(m.baseline_value),
        targetYear: m.target_year,
        targetValue: num(m.target_value),
        unit: m.unit,
        dataProviders: m.data_providers ?? [],
        sourceType: m.source_type,
        mrvOwnerMinistry: m.mrv_owner_ministry,
        qaqcStatus: m.qaqc_status,
        isValidated: m.is_validated,
        lastUpdated: m.last_updated,
      },
      timeseries: byTarget[m.target_id] ?? [],
    };
  }
  return out;
}

export async function getCatalogActivities(targetId = null) {
  const supabase = getSupabaseAdmin();
  let q = supabase.from("ndc_catalog_activities").select("id, target_id, sort_order, body").order("sort_order", { ascending: true });
  if (targetId) q = q.eq("target_id", targetId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCatalogMitigation(targetId = null, sectorId = null) {
  const supabase = getSupabaseAdmin();
  let q = supabase.from("ndc_catalog_mitigation").select("id, target_id, sector_id, sort_order, body").order("sort_order", { ascending: true });
  if (targetId) q = q.eq("target_id", targetId);
  if (sectorId) q = q.eq("sector_id", sectorId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}
