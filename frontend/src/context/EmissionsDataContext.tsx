import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { emissionsApi, cockpitApi, type EmissionsSummary, type ProgressResponse, type TimeseriesResponse, type CatalogActivityRow, type CatalogMitigationRow } from "@/lib/api";
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
const SINCE = 2015;
const TO = 2024;

export interface EmissionsDataContextValue {
  summary: EmissionsSummary | undefined;
  summaryError: Error | null;
  summaryIsLoading: boolean;
  health: { status: string; latency_ms?: number; http_status?: number; last_checked: string } | undefined;
  healthError: Error | null;
  timeseriesBySector: Partial<Record<ClimatetraceApiSector, TimeseriesResponse>>;
  progressBySector: Partial<Record<ClimatetraceApiSector, ProgressResponse>>;
  sectorLoading: Partial<Record<ClimatetraceApiSector, boolean>>;
  sectorError: Partial<Record<ClimatetraceApiSector, Error | null>>;
  isApiReachable: boolean;
  /** Data completeness % blending live MtCO₂e targets + static mock for other targets. */
  dashboardCompleteness: number;
  /** Best-effort “last refresh” for header badges. */
  dashboardLastRefreshIso: string;
  getProgressForTarget: (target: NDCTarget) => { percent: number; status: ProgressStatus; source: "api" | "catalog" | "mock" };
  getObservedMode: (target: NDCTarget) => "live" | "mock";
  /** Supabase-backed non-MtCO₂e indicators (t2,t3,t5,t8). */
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
  const summaryQuery = useQuery({
    queryKey: ["emissions", "summary"],
    queryFn: emissionsApi.summary,
    staleTime: STALE_MS,
    retry: 1,
  });

  const healthQuery = useQuery({
    queryKey: ["emissions", "health", "climatetrace"],
    queryFn: emissionsApi.climateTraceHealth,
    staleTime: 60_000,
    retry: 0,
  });

  const indicatorPanelQuery = useQuery({
    queryKey: ["cockpit", "indicators", "panel", SINCE, TO],
    queryFn: () => cockpitApi.indicatorPanel(SINCE, TO),
    staleTime: STALE_MS,
    retry: 1,
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

  const tsQueries = useQueries({
    queries: CLIMATE_TRACE_API_SECTORS.map((sector) => ({
      queryKey: ["emissions", "timeseries", sector, SINCE, TO],
      queryFn: () => emissionsApi.timeseries(sector, SINCE, TO),
      staleTime: STALE_MS,
      retry: 1,
    })),
  });

  const prQueries = useQueries({
    queries: CLIMATE_TRACE_API_SECTORS.map((sector) => ({
      queryKey: ["emissions", "progress", sector],
      queryFn: () => emissionsApi.progress(sector),
      staleTime: STALE_MS,
      retry: 1,
    })),
  });

  const timeseriesBySector = useMemo(() => {
    const out: Partial<Record<ClimatetraceApiSector, TimeseriesResponse>> = {};
    CLIMATE_TRACE_API_SECTORS.forEach((s, i) => {
      const d = tsQueries[i]?.data;
      if (d) out[s] = d;
    });
    return out;
  }, [tsQueries]);

  const progressBySector = useMemo(() => {
    const out: Partial<Record<ClimatetraceApiSector, ProgressResponse>> = {};
    CLIMATE_TRACE_API_SECTORS.forEach((s, i) => {
      const d = prQueries[i]?.data;
      if (d) out[s] = d;
    });
    return out;
  }, [prQueries]);

  const sectorLoading = useMemo(() => {
    const out: Partial<Record<ClimatetraceApiSector, boolean>> = {};
    CLIMATE_TRACE_API_SECTORS.forEach((s, i) => {
      out[s] = !!(tsQueries[i]?.isLoading || prQueries[i]?.isLoading);
    });
    return out;
  }, [tsQueries, prQueries]);

  const sectorError = useMemo(() => {
    const out: Partial<Record<ClimatetraceApiSector, Error | null>> = {};
    CLIMATE_TRACE_API_SECTORS.forEach((s, i) => {
      const e = tsQueries[i]?.error ?? prQueries[i]?.error;
      out[s] = e instanceof Error ? e : e ? new Error(String(e)) : null;
    });
    return out;
  }, [tsQueries, prQueries]);

  const isApiReachable = !summaryQuery.isError && summaryQuery.data != null;

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
    if (isApiReachable && summaryQuery.dataUpdatedAt) {
      return new Date(summaryQuery.dataUpdatedAt).toISOString();
    }
    const dates = ndcTargets
      .map((t) => getObservedDataForTarget(t.id)?.provenance.lastUpdated)
      .filter(Boolean) as string[];
    if (dates.length === 0) return new Date().toISOString();
    return new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString();
  }, [isApiReachable, summaryQuery.dataUpdatedAt]);

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
      summary: summaryQuery.data,
      summaryError: summaryQuery.error as Error | null,
      summaryIsLoading: summaryQuery.isLoading,
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
      summaryQuery.data,
      summaryQuery.error,
      summaryQuery.isLoading,
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
