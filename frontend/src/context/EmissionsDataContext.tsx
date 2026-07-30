/**
 * The single source of emissions data for the whole app.
 *
 * Fetches the dashboard payload once and shares it with every screen that needs
 * it, rather than each one asking separately. Re-fetches when the geography
 * changes between national and a specific district.
 *
 * It also runs the accuracy guardrails (see lib/data-validation.ts) over
 * incoming figures, so suspicious values are flagged as they arrive rather than
 * after they have already been drawn on a chart.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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
  type DistrictListEntry,
} from "@/lib/api";
import { useAppContext } from "@/hooks/use-app-state";
import {
  CLIMATE_TRACE_API_SECTORS,
  type ClimatetraceApiSector,
  getClimateTraceSectorForTarget,
  isIndicatorPanelTarget,
  buildIndicatorPanelObservedDataSet,
  progressFromLiveApiFields,
  progressFromEconomyWideTimeseries,
  isDistrictProgressBlocked,
  type IndicatorPanelEntry,
} from "@/lib/emissions-integration";
import { reconciliationDeltaPercent } from "@/lib/progress";
import { ndcTargets, getObservedDataForTarget, calculateProgress, type NDCTarget, type NDCActivity, type MitigationOption } from "@/data/uganda-ndc-data";
import type { ProgressStatus } from "@/data/uganda-ndc-data";
import { validateDashboardTimeseries, reportIssues } from "@/lib/data-validation";

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
  geography: "national" | "district";
  districtName: string | null;
  isDistrictView: boolean;
  availableDistricts: DistrictListEntry[];
  dashboardCompleteness: number;
  dashboardLastRefreshIso: string;
  economyWideTimeseries: { year: number; value: number | null }[];
  getProgressForTarget: (target: NDCTarget) => { percent: number | null; status: ProgressStatus; source: "api" | "catalog" | "mock" };
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
  const { geographyLevel, selectedDistrictId } = useAppContext();
  const districtName =
    geographyLevel === "district" && selectedDistrictId ? selectedDistrictId : null;
  const geographyKey = districtName ?? "national";

  const districtsQuery = useQuery({
    queryKey: ["emissions", "districts"],
    queryFn: () => emissionsApi.districts(),
    staleTime: Infinity,
    retry: 1,
  });

  const dashboardQuery = useQuery({
    queryKey: ["emissions", "dashboard", geographyKey],
    queryFn: () =>
      emissionsApi.dashboard(
        undefined,
        undefined,
        districtName ? { district: districtName } : undefined,
      ),
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
          geography: d.geography ?? "national",
          gadm_id: d.gadm_id,
          district_name: d.district_name,
          timeseries: series,
        };
      }
    }
    return out;
  }, [dashboardQuery.data]);

  // Validate incoming dashboard data — fires whenever a new dashboard response arrives
  useEffect(() => {
    const d = dashboardQuery.data;
    if (!d?.timeseries) return;
    const rawTs: Record<string, { year: number; value: number | null }[]> = {};
    for (const s of CLIMATE_TRACE_API_SECTORS) {
      const series = d.timeseries[s as keyof typeof d.timeseries];
      if (series) rawTs[s] = series as { year: number; value: number | null }[];
    }
    const geo = d.geography === "district" ? "district" : "national";
    const issues = validateDashboardTimeseries(rawTs, geo);
    if (issues.length > 0) reportIssues(issues);
  }, [dashboardQuery.data]);

  // Economy-wide observed series = sum of all CT sectors per year (replaces fabricated t0 mock data)
  const economyWideTimeseries = useMemo(() => {
    const d = dashboardQuery.data;
    if (!d?.timeseries) return [];
    const years = new Set<number>();
    for (const s of CLIMATE_TRACE_API_SECTORS) {
      for (const p of d.timeseries[s as keyof typeof d.timeseries] ?? []) years.add(p.year);
    }
    return Array.from(years)
      .sort((a, b) => a - b)
      .map((year) => {
        let total = 0;
        let complete = true;
        for (const s of CLIMATE_TRACE_API_SECTORS) {
          const pts = d.timeseries[s as keyof typeof d.timeseries] ?? [];
          const pt = (pts as { year: number; value: number | null }[]).find((x) => x.year === year);
          if (pt?.value == null) {
            complete = false;
            break;
          }
          total += pt.value;
        }
        return { year, value: complete ? Math.round(total * 100) / 100 : null };
      });
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
  const geography = dashboard?.geography ?? (districtName ? "district" : "national");
  const isDistrictView = geography === "district";
  const availableDistricts = districtsQuery.data?.districts ?? [];

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
      return rows.filter((r) => r.target_id === targetId).map((r) => r.body as unknown as NDCActivity);
    },
    [catalogActivitiesQuery.data],
  );

  const getMitigationFromCatalog = useCallback(
    (targetId: string, sectorId: string): MitigationOption[] => {
      const rows = catalogMitigationQuery.data?.options ?? [];
      return rows
        .filter((r) => r.target_id === targetId && r.sector_id === sectorId)
        .map((r) => r.body as unknown as MitigationOption);
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
    (target: NDCTarget): { percent: number | null; status: ProgressStatus; source: "api" | "catalog" | "mock" } => {
      if (isDistrictProgressBlocked(target, isDistrictView)) {
        return { percent: null, status: "unknown", source: "api" };
      }

      const sector = getClimateTraceSectorForTarget(target);
      const pr = sector ? progressBySector[sector] : undefined;
      const err = sector ? sectorError[sector] : null;
      if (sector && pr && !err) {
        const live = progressFromLiveApiFields(pr, target, {
          dataStale: dashboard?.data_stale,
          reconciliationDeltaPct: reconciliationDeltaPercent(
            reconciliation?.delta_mt,
            reconciliation?.sector_sum_mt,
          ),
        });
        return { ...live, source: "api" };
      }

      if (
        target.sectorId === "economy-wide" &&
        economyWideTimeseries.length > 0 &&
        isApiReachable &&
        !dashboardQuery.isError
      ) {
        const live = progressFromEconomyWideTimeseries(target, economyWideTimeseries);
        return { ...live, source: "api" };
      }

      const ind = isIndicatorPanelTarget(target) ? indicatorPanelQuery.data?.targets?.[target.id] : undefined;
      if (ind?.timeseries?.length && !indicatorPanelQuery.error) {
        const obs = buildIndicatorPanelObservedDataSet(target, ind);
        return { ...calculateProgress(target, obs), source: "catalog" };
      }

      const obs = getObservedDataForTarget(target.id);
      return { ...calculateProgress(target, obs), source: "mock" };
    },
    [
      progressBySector,
      sectorError,
      indicatorPanelQuery.data,
      indicatorPanelQuery.error,
      economyWideTimeseries,
      isApiReachable,
      isDistrictView,
      dashboardQuery.isError,
      dashboard,
      reconciliation,
    ],
  );

  const getObservedMode = useCallback(
    (target: NDCTarget): "live" | "mock" => {
      const sector = getClimateTraceSectorForTarget(target);
      if (sector && !sectorError[sector]) {
        const ts = timeseriesBySector[sector]?.timeseries;
        const pr = progressBySector[sector];
        if (ts && ts.some((p) => p.value != null) && pr) return "live";
      }

      if (
        target.sectorId === "economy-wide" &&
        economyWideTimeseries.some((p) => p.value != null) &&
        isApiReachable
      ) {
        return "live";
      }

      const ind = isIndicatorPanelTarget(target) ? indicatorPanelQuery.data?.targets?.[target.id] : undefined;
      if (ind?.timeseries?.length && !indicatorPanelQuery.error) return "live";

      return "mock";
    },
    [
      timeseriesBySector,
      progressBySector,
      sectorError,
      indicatorPanelQuery.data,
      indicatorPanelQuery.error,
      economyWideTimeseries,
      isApiReachable,
    ],
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
      economyWideTimeseries,
      timeseriesBySector,
      progressBySector,
      sectorLoading,
      sectorError,
      isApiReachable,
      geography,
      districtName,
      isDistrictView,
      availableDistricts,
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
      economyWideTimeseries,
      isApiReachable,
      geography,
      districtName,
      isDistrictView,
      availableDistricts,
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
