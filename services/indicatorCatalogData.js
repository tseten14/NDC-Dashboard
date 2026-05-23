import {
  INDICATOR_META,
  INDICATOR_YEARLY,
  CATALOG_ACTIVITIES,
  CATALOG_MITIGATION,
} from "../config/ndcCockpitCatalog.js";

function num(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? +n.toFixed(4) : null;
}

/**
 * Panel payload for non-MtCO₂e targets (t2, t3, t5, t8) keyed by target_id.
 */
export async function getIndicatorPanel(since = 2015, to = 2024) {
  const byTarget = {};
  for (const row of INDICATOR_YEARLY) {
    if (row.year < since || row.year > to) continue;
    if (!byTarget[row.target_id]) byTarget[row.target_id] = [];
    byTarget[row.target_id].push({ year: row.year, value: num(row.value) });
  }

  const out = {};
  for (const m of INDICATOR_META) {
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
  let rows = CATALOG_ACTIVITIES;
  if (targetId) rows = rows.filter((r) => r.target_id === targetId);
  return rows.map((r) => ({ ...r }));
}

export async function getCatalogMitigation(targetId = null, sectorId = null) {
  let rows = CATALOG_MITIGATION;
  if (targetId) rows = rows.filter((r) => r.target_id === targetId);
  if (sectorId) rows = rows.filter((r) => r.sector_id === sectorId);
  return rows.map((r) => ({ ...r }));
}
