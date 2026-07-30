/**
 * Supplies the indicator and measure catalogues.
 *
 * An "indicator" is something being tracked toward a target (forest cover, for
 * example); a "mitigation option" is a measure a ministry could fund to move it.
 * This module reads both from the bundled configuration and attaches each
 * item's quality-review status, so the screens can show not just a number but
 * how trustworthy that number is.
 */
import {
  INDICATOR_META,
  INDICATOR_YEARLY,
  CATALOG_ACTIVITIES,
  CATALOG_MITIGATION,
} from "../../config/ndcCockpitCatalog.js";
import { reviewDashboardQaqc } from "../../shared/qaqcReview.js";

function num(v) {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? +n.toFixed(4) : null;
}

/**
 * Panel payload for non-CT-tracked NDC targets (t2, t3, t8, t9, t10) keyed by target_id.
 * t5 was removed from this panel — transport is now a CT-tracked sector per NDC 2022.
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
    const timeseries = byTarget[m.target_id] ?? [];
    const reviewed = reviewDashboardQaqc(timeseries, m.unit);
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
        qaqcStatus: reviewed.qaqcStatus,
        isValidated: reviewed.isValidated,
        lastUpdated: m.last_updated,
      },
      timeseries,
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
