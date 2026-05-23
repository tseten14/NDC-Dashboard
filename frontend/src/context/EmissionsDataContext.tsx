import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  emissionsApi,
  cockpitApi,
  type EmissionsSummary,
  type EmissionsDashboard,
  type EmissionsReconciliation,
  type EmissionsCoverage,
  type SlugBreakdownBySector,
  type ProgressResponse,
  type TimeseriesResponse,
  type CatalogActivityRow,
  type CatalogMitigationRow,
} from "@/lib/api";
import {
  CLIMATE_TRACE_API_SECTORS,
  type ClimatetraceApiSector,
  getClimateTraceSectorForTarget,
  apiStatusToProgressStatus,
  isIndicatorPanelTarget,
  buildIndicatorPanelObservedDataSet,
  type IndicatorPanelEntry,
} from "@/lib/emissions-integration";
import { ndcTargets, getObservedDataForTarget, calculateProgress, type NDCTarget, type NDCActivity, type MitigationOption } from "@/data/uganda-ndc-data";
import type { ProgressStatus } from "@/data/uganda-ndc-data";

const STALE_MS = 15 * 60 * 1000;

export interface EmissionsDataContextValue {
  summary: EmissionsSummary | undefined;
  dashboard: EmissionsDashboard | undefined;
  reconciliation: EmissionsReconciliation | undefined;
  coverage: EmissionsCoverage | undefined;
  slugBreakdownBySector: Partial<Record<ClimatetraceApiSector, SlugBreakdownBySector>>;
  summaryError: Error | null;
  summaryIsLoading: boolean;
  health: { status: string; latency_ms?: number; http_status?: number; last_checked: string } | undefined;
  healthError: Error | null;
  timeseriesBySector: Partial<Record<ClimatetraceApiSector, TimeseriesResponse>>;
  progressBySector: Partial<Record<ClimatetraceApiSector, ProgressResponse>>;
  sectorLoading: Partial<Record<ClimatetraceApiSector, boolean>>;
  sectorError: Partial<Record<ClimatetraceApiSector, Error | null>>;
  isApiReachable: boolean;
  dashboardCompleteness: number;
  dashboardLastRefreshIso: string;
  getProgressForTarget: (target: NDCTarget) => { percent: number; status: ProgressStatus; source: "api" | "catalog" | "mock" };
  getObservedMode: (target: NDCTarget) => "live" | "mock";
  indicatorTargets: Record<string, IndicatorPanelEntry> | undefined;
  indicatorPanelLoading: boolean;
  indicatorPanelError: Error | null;
  catalogActivities: CatalogActivityRow[] | undefined;
  catalogMitigation: CatalogMitigationRow[] | undefined;
  catalogLoading: boolean;
  catalogError: Error | null;
  getActivitiesFromCatalog: (targetId: string) => NDCActivity[];
  getMitigationFromCatalog: (targetId: string, sectorId: string) => MitigationOption[];
}

const EmissionsDataContext = createContext<EmissionsDataContextValue | null>(null);

export function EmissionsDataProvider({ children }: { children: ReactNode }) {
  const dashboardQuery = useQuery({
    queryKey: ["emissions", "dashboard"],
    queryFn: () => emissionsApi.dashboard(),
    staleTime: STALE_MS,
    retry: 1,
  });

  const since = dashboardQuery.data?.since ?? 2015;
  const to = dashboardQuery.data?.to ?? dashboardQuery.data?.inventory_year ?? 2024;

  const healthQuery = useQuery({
    queryKey: ["emissions", "health", "climatetrace"],
    queryFn: emissionsApi.climateTraceHealth,
    staleTime: 60_000,
    retry: 0,
  });

  const indicatorPanelQuery = useQuery({
    queryKey: ["cockpit", "indicators", "panel", since, to],
    queryFn: () => cockpitApi.indicatorPanel(since, to),
    staleTime: STALE_MS,
    retry: 1,
    enabled: dashboardQuery.isSuccess || dashboardQuery.isError,
  });

  const catalogActivitiesQuery = useQuery({
    queryKey: ["cockpit", "catalog", "activities"],
    queryFn: () => cockpitApi.catalogActivities(),
    staleTime: STALE_MS,
    retry: 1,
  });

  const catalogMitigationQuery = useQuery({
    queryKey: ["cockpit", "catalog", "mitigation"],
    queryFn: () => cockpitApi.catalogMitigationOptions(),
    staleTime: STALE_MS,
    retry: 1,
  });

  const summary = useMemo((): EmissionsSummary | undefined => {
    const d = dashboardQuery.data;
    if (!d) return undefined;
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
      sectors: d.sectors,
      reconciliation: d.reconciliation,
    };
  }, [dashboardQuery.data]);

  const dashboard = dashboardQuery.data;
  const reconciliation = dashboard?.reconciliation;
  const coverage = dashboard?.coverage;
  const slugBreakdownBySector = dashboard?.slug_breakdown_by_sector ?? {};

  const timeseriesBySector = useMemo(() => {
    const d = dashboardQuery.data;
    if (!d?.timeseries) return {};
    const out: Partial<Record<ClimatetraceApiSector, TimeseriesResponse>> = {};
    for (const sector of CLIMATE_TRACE_API_SECTORS) {
      const series = d.timeseries[sector];
      if (series) {
        out[sector] = {
          sector,
          unit: "MtCO2e",
          data_source: d.data_source,
          data_license: "Creative Commons 4.0",
          geography: "national",
          timeseries: series,
        };
      }
    }
    return out;
  }, [dashboardQuery.data]);

  const progressBySector = useMemo(() => {
    return dashboardQuery.data?.progress ?? {};
  }, [dashboardQuery.data]);

  const sectorLoading = useMemo(() => {
    const loading = dashboardQuery.isLoading;
    const out: Partial<Record<ClimatetraceApiSector, boolean>> = {};
    for (const s of CLIMATE_TRACE_API_SECTORS) out[s] = loading;
    return out;
  }, [dashboardQuery.isLoading]);

  const dashboardErr = dashboardQuery.error;
  const sectorError = useMemo(() => {
    const err = dashboardErr instanceof Error ? dashboardErr : dashboardErr ? new Error(String(dashboardErr)) : null;
    const out: Partial<Record<ClimatetraceApiSector, Error | null>> = {};
    for (const s of CLIMATE_TRACE_API_SECTORS) out[s] = err;
    return out;
  }, [dashboardErr]);

  const isApiReachable = !dashboardQuery.isError && dashboardQuery.data != null;

  const indicatorTargets = indicatorPanelQuery.data?.targets;
  const indicatorPanelLoading = indicatorPanelQuery.isLoading;
  const indicatorPanelError = indicatorPanelQuery.error as Error | null;

  const catalogActivities = catalogActivitiesQuery.data?.activities;
  const catalogMitigation = catalogMitigationQuery.data?.options;
  const catalogLoading = catalogActivitiesQuery.isLoading || catalogMitigationQuery.isLoading;
  const catalogError = (catalogActivitiesQuery.error ?? catalogMitigationQuery.error) as Error | null;

  const getActivitiesFromCatalog = useCallback(
    (targetId: string): NDCActivity[] => {
      const rows = catalogActivitiesQuery.data?.activities ?? [];
      return rows.filter((r) => r.target_id === targetId).map((r) => r.body as NDCActivity);
    },
    [catalogActivitiesQuery.data],
  );

  const getMitigationFromCatalog = useCallback(
    (targetId: string, sectorId: string): MitigationOption[] => {
      const rows = catalogMitigationQuery.data?.options ?? [];
      return rows
        .filter((r) => r.target_id === targetId && r.sector_id === sectorId)
        .map((r) => r.body as MitigationOption);
    },
    [catalogMitigationQuery.data],
  );

  const dashboardCompleteness = useMemo(() => {
    let good = 0;
    const total = ndcTargets.length;
    for (const t of ndcTargets) {
      const sector = getClimateTraceSectorForTarget(t);
      if (sector) {
        const ts = timeseriesBySector[sector]?.timeseries;
        const ok =
          ts &&
          ts.length > 0 &&
          !sectorError[sector] &&
          ts.some((p) => p.value != null);
        if (ok) good++;
      } else if (isIndicatorPanelTarget(t)) {
        const ind = indicatorPanelQuery.data?.targets?.[t.id];
        const ok = !!(ind?.timeseries?.length && !indicatorPanelQuery.error);
        if (ok) good++;
      } else {
        const obs = getObservedDataForTarget(t.id);
        if (obs?.provenance.isValidated && obs.provenance.qaqcStatus === "ok") good++;
      }
    }
    return total ? Math.round((good / total) * 100) : 0;
  }, [timeseriesBySector, sectorError, indicatorPanelQuery.data, indicatorPanelQuery.error]);

  const dashboardLastRefreshIso = useMemo(() => {
    if (isApiReachable && dashboardQuery.dataUpdatedAt) {
      return new Date(dashboardQuery.dataUpdatedAt).toISOString();
    }
    const dates = ndcTargets
      .map((t) => getObservedDataForTarget(t.id)?.provenance.lastUpdated)
      .filter(Boolean) as string[];
    if (dates.length === 0) return new Date().toISOString();
    return new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString();
  }, [isApiReachable, dashboardQuery.dataUpdatedAt]);

  const getProgressForTarget = useCallback(
    (target: NDCTarget): { percent: number; status: ProgressStatus; source: "api" | "catalog" | "mock" } => {
      const sector = getClimateTraceSectorForTarget(target);
      const pr = sector ? progressBySector[sector] : undefined;
      const err = sector ? sectorError[sector] : null;
      if (sector && pr && !err) {
        return {
          percent: pr.progress_pct ?? 0,
          status: apiStatusToProgressStatus(pr.status),
          source: "api",
        };
      }

      const ind = isIndicatorPanelTarget(target) ? indicatorPanelQuery.data?.targets?.[target.id] : undefined;
      if (ind?.timeseries?.length && !indicatorPanelQuery.error) {
        const obs = buildIndicatorPanelObservedDataSet(target, ind);
        return { ...calculateProgress(target, obs), source: "catalog" };
      }

      const obs = getObservedDataForTarget(target.id);
      return { ...calculateProgress(target, obs), source: "mock" };
    },
    [progressBySector, sectorError, indicatorPanelQuery.data, indicatorPanelQuery.error],
  );

  const getObservedMode = useCallback(
    (target: NDCTarget): "live" | "mock" => {
      const sector = getClimateTraceSectorForTarget(target);
      if (sector && !sectorError[sector]) {
        const ts = timeseriesBySector[sector]?.timeseries;
        if (ts && ts.length > 0) return "live";
      }

      const ind = isIndicatorPanelTarget(target) ? indicatorPanelQuery.data?.targets?.[target.id] : undefined;
      if (ind?.timeseries?.length && !indicatorPanelQuery.error) return "live";

      return "mock";
    },
    [timeseriesBySector, sectorError, indicatorPanelQuery.data, indicatorPanelQuery.error],
  );

  const value = useMemo(
    () => ({
      summary,
      dashboard,
      reconciliation,
      coverage,
      slugBreakdownBySector,
      summaryError: dashboardQuery.error as Error | null,
      summaryIsLoading: dashboardQuery.isLoading,
      health: healthQuery.data,
      healthError: healthQuery.error as Error | null,
      timeseriesBySector,
      progressBySector,
      sectorLoading,
      sectorError,
      isApiReachable,
      dashboardCompleteness,
      dashboardLastRefreshIso,
      getProgressForTarget,
      getObservedMode,
      indicatorTargets,
      indicatorPanelLoading,
      indicatorPanelError,
      catalogActivities,
      catalogMitigation,
      catalogLoading,
      catalogError,
      getActivitiesFromCatalog,
      getMitigationFromCatalog,
    }),
    [
      summary,
      dashboard,
      reconciliation,
      coverage,
      slugBreakdownBySector,
      dashboardQuery.error,
      dashboardQuery.isLoading,
      healthQuery.data,
      healthQuery.error,
      timeseriesBySector,
      progressBySector,
      sectorLoading,
      sectorError,
      isApiReachable,
      dashboardCompleteness,
      dashboardLastRefreshIso,
      getProgressForTarget,
      getObservedMode,
      indicatorTargets,
      indicatorPanelLoading,
      indicatorPanelError,
      catalogActivities,
      catalogMitigation,
      catalogLoading,
      catalogError,
      getActivitiesFromCatalog,
      getMitigationFromCatalog,
    ],
  );

  return <EmissionsDataContext.Provider value={value}>{children}</EmissionsDataContext.Provider>;
}

export function useEmissionsData(): EmissionsDataContextValue {
  const ctx = useContext(EmissionsDataContext);
  if (!ctx) throw new Error("useEmissionsData must be used within EmissionsDataProvider");
  return ctx;
}
