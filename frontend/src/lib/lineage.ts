/**
 * Builds the source trail for one target.
 *
 * Assembles the chain from a displayed figure back to the data it came from, for
 * the "where did this come from?" panels.
 */
import type { NDCTarget } from "@/data/uganda-ndc-data";
import type { DataLineage } from "@/components/DataLineageChip";
import type { EmissionsDataContextValue } from "@/context/EmissionsDataContext";
import { getClimateTraceSectorForTarget, getProxySectorForTarget, isIndicatorPanelTarget } from "@/lib/emissions-integration";
import { deriveTraceDataQuality, reconciliationDeltaPercent } from "@/lib/progress";

export function buildTargetLineage(
  target: NDCTarget,
  emissions: EmissionsDataContextValue,
  source: "api" | "catalog" | "mock",
): DataLineage {
  const apiSector = getClimateTraceSectorForTarget(target) ?? (emissions.isDistrictView ? getProxySectorForTarget(target) : null);
  const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;
  const ind = isIndicatorPanelTarget(target) ? emissions.indicatorTargets?.[target.id] : undefined;

  if (source === "api" && pr) {
    const deltaPct =
      reconciliationDeltaPercent(
        emissions.reconciliation?.delta_mt,
        emissions.reconciliation?.sector_sum_mt,
      ) ?? null;
    const derived = deriveTraceDataQuality({
      missingSlugs: pr.missing_slugs,
      timeseries: apiSector ? emissions.timeseriesBySector[apiSector]?.timeseries : undefined,
      dataStale: emissions.dashboard?.data_stale,
      reconciliationDeltaPct: deltaPct,
    });
    const year = pr.latest_year;
    return {
      source: pr.data_source || "Climate TRACE",
      asOf: year != null ? `${year}-12-31` : emissions.dashboardLastRefreshIso,
      isEstimated: derived.isEstimated,
      isValidated: derived.isValidated,
    };
  }

  if (source === "catalog" && ind) {
    return {
      source: emissions.indicatorPanelError ? "Indicators API (degraded)" : "Indicators API",
      asOf: ind.meta.lastUpdated,
      isEstimated: false,
      isValidated: ind.meta.isValidated,
    };
  }

  if (source === "api" && target.sectorId === "economy-wide") {
    const series = emissions.economyWideTimeseries;
    const latest = [...series].reverse().find((point) => point.value != null);
    return {
      source: "Climate TRACE",
      asOf: latest ? `${latest.year}-12-31` : null,
      ...deriveTraceDataQuality({ timeseries: series, dataStale: emissions.dashboard?.data_stale }),
    };
  }
  return { source: "Data unavailable", asOf: null, isEstimated: false, isValidated: false };
}
