/**
 * Builds the source trail for one target.
 *
 * Assembles the chain from a displayed figure back to the data it came from, for
 * the "where did this come from?" panels.
 */
import type { NDCTarget } from "@/data/uganda-ndc-data";
import { getObservedDataForTarget } from "@/data/uganda-ndc-data";
import type { DataLineage } from "@/components/DataLineageChip";
import type { EmissionsDataContextValue } from "@/context/EmissionsDataContext";
import { getClimateTraceSectorForTarget, isIndicatorPanelTarget } from "@/lib/emissions-integration";
import { deriveTraceDataQuality, reconciliationDeltaPercent } from "@/lib/progress";

export function buildTargetLineage(
  target: NDCTarget,
  emissions: EmissionsDataContextValue,
  source: "api" | "catalog" | "mock",
): DataLineage {
  const apiSector = getClimateTraceSectorForTarget(target);
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

  const obs = getObservedDataForTarget(target.id);
  return {
    source: obs?.dataProviders[0] ?? "Bundled / MRV seed",
    asOf: obs?.provenance.lastUpdated ?? emissions.dashboardLastRefreshIso,
    isEstimated: true,
    isValidated: obs?.provenance.isValidated ?? false,
  };
}
