/**
 * Fetches the recorded values for one target.
 *
 * These are the figures imported through the ingestion screen, as distinct from
 * the live Climate TRACE measurements.
 */
import { useQuery } from "@tanstack/react-query";
import { persistenceApi } from "@/lib/api";

const STALE_MS = 2 * 60 * 1000;

/** Fetches persisted observations for a dashboard target (ingest + seed data). */
export function useTargetObservations(targetId: string | null | undefined) {
  return useQuery({
    queryKey: ["persistence", "observations", targetId],
    queryFn: () => persistenceApi.targetObservations(targetId!),
    enabled: Boolean(targetId),
    staleTime: STALE_MS,
    retry: 1,
  });
}
