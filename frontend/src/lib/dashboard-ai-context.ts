import {
  ndcTargets,
  getObservedDataForTarget,
  type NDCTarget,
  type SectorId,
} from "@/data/uganda-ndc-data";
import type { EmissionsDataContextValue } from "@/context/EmissionsDataContext";
import {
  CLIMATE_TRACE_API_SECTORS,
  getClimateTraceSectorForTarget,
} from "@/lib/emissions-integration";
import { getTargetPlainLanguage } from "@/lib/target-plain-language";

export type DashboardQuickAction =
  | "progress_check"
  | "gap_analysis"
  | "sector_emissions"
  | "priorities";

export interface DashboardAnalyzeContext {
  geography: "national" | "district";
  district_name: string | null;
  selected_sector: string;
  selected_target: {
    id: string;
    sector: string;
    summary: string;
    baseline_year: number;
    baseline_value: number;
    target_year: number;
    target_value: number;
    unit: string;
    conditionality: string;
    metric_type: string;
  } | null;
  selected_target_progress: {
    percent: number | null;
    status: string;
    source: string;
    latest_year: number | null;
    latest_value: number | null;
    bau_2030: number | null;
  } | null;
  observed_latest: { year: number; value: number; unit: string } | null;
  all_targets_summary: Array<{
    id: string;
    sector: string;
    summary: string;
    progress_pct: number | null;
    status: string;
    latest_value: number | null;
    target_value: number;
    unit: string;
  }>;
  climate_trace: {
    data_source: string;
    inventory_years: { since: number; to: number };
    api_reachable: boolean;
    sectors: Record<
      string,
      {
        latest_year: number | null;
        latest_value_mt: number | null;
        progress_pct: number | null;
        status: string;
        target_value_mt: number;
        bau_2030_mt: number | null;
        scope_note: string | null;
        recent_timeseries: { year: number; value: number | null }[];
      }
    >;
    reconciliation: {
      reference_year: number | null;
      country_total_mt: number | null;
      sector_sum_mt: number | null;
      delta_mt: number | null;
    } | null;
  };
  data_freshness: string | null;
}

function latestObservedRow(target: NDCTarget) {
  const obs = getObservedDataForTarget(target.id);
  if (!obs?.historicalData?.length) return null;
  for (let i = obs.historicalData.length - 1; i >= 0; i--) {
    const row = obs.historicalData[i];
    if (row.value != null) return { year: row.year, value: row.value, unit: target.unit };
  }
  return null;
}

function recentTimeseries(
  rows: { year: number; value: number | null }[] | undefined,
  maxPoints = 8,
) {
  if (!rows?.length) return [];
  return rows.filter((r) => r.year < 2030).slice(-maxPoints);
}

export function buildDashboardAnalyzeContext(
  emissions: EmissionsDataContextValue,
  selectedSector: SectorId,
  selectedTarget: NDCTarget | null,
): DashboardAnalyzeContext {
  const allTargetsSummary = ndcTargets.map((t) => {
    const { percent, status } = emissions.getProgressForTarget(t);
    const apiSector = getClimateTraceSectorForTarget(t);
    const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;
    return {
      id: t.id,
      sector: t.sectorId,
      summary: getTargetPlainLanguage(t).summary,
      progress_pct: percent,
      status,
      latest_value: pr?.latest_value ?? null,
      target_value: t.targetValue,
      unit: t.unit,
    };
  });

  const sectors: DashboardAnalyzeContext["climate_trace"]["sectors"] = {};
  for (const sector of CLIMATE_TRACE_API_SECTORS) {
    const pr = emissions.progressBySector[sector];
    const ts = emissions.timeseriesBySector[sector];
    if (!pr && !ts) continue;
    sectors[sector] = {
      latest_year: pr?.latest_year ?? null,
      latest_value_mt: pr?.latest_value ?? null,
      progress_pct: pr?.progress_pct ?? null,
      status: pr?.status ?? "unknown",
      target_value_mt: pr?.target_value ?? 0,
      bau_2030_mt: pr?.bau_2030 ?? null,
      scope_note: pr?.scope_note ?? null,
      recent_timeseries: recentTimeseries(ts?.timeseries),
    };
  }

  let selectedProgress = null;
  let observedLatest = null;
  if (selectedTarget) {
    const { percent, status, source } = emissions.getProgressForTarget(selectedTarget);
    const apiSector = getClimateTraceSectorForTarget(selectedTarget);
    const pr = apiSector ? emissions.progressBySector[apiSector] : undefined;
    selectedProgress = {
      percent,
      status,
      source,
      latest_year: pr?.latest_year ?? null,
      latest_value: pr?.latest_value ?? null,
      bau_2030: pr?.bau_2030 ?? null,
    };
    observedLatest = latestObservedRow(selectedTarget);
  }

  const rec = emissions.reconciliation;

  return {
    geography: emissions.geography,
    district_name: emissions.districtName,
    selected_sector: selectedSector,
    selected_target: selectedTarget
      ? {
          id: selectedTarget.id,
          sector: selectedTarget.sectorId,
          summary: getTargetPlainLanguage(selectedTarget).summary,
          baseline_year: selectedTarget.baselineYear,
          baseline_value: selectedTarget.baselineValue,
          target_year: selectedTarget.targetYear,
          target_value: selectedTarget.targetValue,
          unit: selectedTarget.unit,
          conditionality: selectedTarget.conditionality,
          metric_type: selectedTarget.metricType,
        }
      : null,
    selected_target_progress: selectedProgress,
    observed_latest: observedLatest,
    all_targets_summary: allTargetsSummary,
    climate_trace: {
      data_source: "Climate TRACE v7 API",
      inventory_years: {
        since: emissions.dashboard?.since ?? 2015,
        to: emissions.dashboard?.to ?? emissions.dashboard?.inventory_year ?? 2025,
      },
      api_reachable: emissions.isApiReachable,
      sectors,
      reconciliation: rec
        ? {
            reference_year: rec.reference_year ?? null,
            country_total_mt: rec.country_total_mt ?? null,
            sector_sum_mt: rec.sector_sum_mt ?? null,
            delta_mt: rec.delta_mt ?? null,
          }
        : null,
    },
    data_freshness: emissions.dashboardLastRefreshIso ?? null,
  };
}

export const DASHBOARD_QUICK_ACTIONS: {
  type: DashboardQuickAction;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    type: "progress_check",
    label: "Progress check",
    description: "How is the selected target doing?",
    icon: "Target",
  },
  {
    type: "gap_analysis",
    label: "Gap vs pledge",
    description: "Measured data vs NDC commitment",
    icon: "BarChart3",
  },
  {
    type: "sector_emissions",
    label: "Sector emissions",
    description: "Climate TRACE trend for this sector",
    icon: "Satellite",
  },
  {
    type: "priorities",
    label: "Top priorities",
    description: "Which targets need attention",
    icon: "Zap",
  },
];
