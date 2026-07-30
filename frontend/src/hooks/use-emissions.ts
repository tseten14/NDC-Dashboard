/**
 * Fetches emissions data for the screens.
 *
 * Wraps the API calls for summaries, yearly histories, progress and the Climate
 * TRACE health check, handling loading and error states and caching results so
 * that revisiting a screen does not re-fetch everything.
 */
import { useQuery } from "@tanstack/react-query";
import { emissionsApi, type NdcSectorKey } from "@/lib/api";

const FIFTEEN_MIN = 15 * 60 * 1000;

export function useEmissionsSummary() {
  return useQuery({
    queryKey: ["emissions", "summary"],
    queryFn: emissionsApi.summary,
    staleTime: FIFTEEN_MIN,
    retry: 1,
  });
}

export function useEmissionsTimeseries(sector: NdcSectorKey | null, since = 2015, to = 2024) {
  return useQuery({
    queryKey: ["emissions", "timeseries", sector, since, to],
    queryFn: () => emissionsApi.timeseries(sector as NdcSectorKey, since, to),
    enabled: !!sector,
    staleTime: FIFTEEN_MIN,
  });
}

export function useEmissionsProgress(sector: NdcSectorKey | null) {
  return useQuery({
    queryKey: ["emissions", "progress", sector],
    queryFn: () => emissionsApi.progress(sector as NdcSectorKey),
    enabled: !!sector,
    staleTime: FIFTEEN_MIN,
  });
}

export function useClimateTraceHealth() {
  return useQuery({
    queryKey: ["emissions", "health", "climatetrace"],
    queryFn: emissionsApi.climateTraceHealth,
    staleTime: 60_000,
    retry: 0,
  });
}
