/**
 * The live figures strip along the top of the dashboard.
 *
 * Shows the current emissions per sector, when they were last refreshed, whether
 * the answer came from cache, and a link into the accuracy audit.
 */
import { Activity, Satellite, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { cn } from "@/lib/utils";

const SECTOR_LABEL: Record<string, string> = {
  afolu: "AFOLU",
  energy: "ENERGY",
  ippu: "IPPU",
  agriculture: "AGRICULTURE",
  waste: "WASTE",
  transport: "TRANSPORT",
};

const STATUS_CLS: Record<string, string> = {
  on_track: "bg-on-track/15 text-[hsl(var(--on-track))] border-[hsl(var(--on-track))]/30",
  at_risk: "bg-at-risk/15 text-[hsl(var(--at-risk))] border-[hsl(var(--at-risk))]/30",
  mixed: "bg-at-risk/15 text-[hsl(var(--at-risk))] border-[hsl(var(--at-risk))]/30",
  off_track: "bg-off-track/15 text-[hsl(var(--off-track))] border-[hsl(var(--off-track))]/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

interface LiveEmissionsBannerProps {
  /** Opens the Accuracy Audit drawer */
  onOpenAccuracyDetails?: () => void;
  /** Hide per-sector Mt chips (e.g. district view) to keep the strip compact */
  compact?: boolean;
}

export function LiveEmissionsBanner({
  onOpenAccuracyDetails,
  compact = false,
}: LiveEmissionsBannerProps) {
  const {
    summary: data,
    summaryIsLoading: isLoading,
    summaryError: error,
    health,
    reconciliation,
    dashboardLastRefreshIso,
  } = useEmissionsData();
  const isBundledSource = !!data?.data_source && /bundled|mock/i.test(data.data_source);

  if (error) {
    const isDev = import.meta.env.DEV;
    return (
      <div className="px-3 py-1.5 border-b border-border bg-destructive/5 flex items-center gap-2">
        <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
        <span className="text-xs text-destructive leading-snug">
          {isDev ? (
            <>
              Live emissions API unreachable. Start it with{" "}
              <code className="font-mono">npm run start:api</code>
            </>
          ) : (
            <>
              Live Climate TRACE unavailable ({error.message || "request failed"}). Check{" "}
              <a href="/api/health" className="underline font-medium" target="_blank" rel="noreferrer">
                /api/health
              </a>{" "}
              and{" "}
              <a
                href="/api/v1/health/climatetrace"
                className="underline font-medium"
                target="_blank"
                rel="noreferrer"
              >
                Climate TRACE health
              </a>
              . First load may take up to 60s while sector data is fetched.
            </>
          )}
        </span>
      </div>
    );
  }

  const recon = reconciliation;
  const refreshLabel = dashboardLastRefreshIso
    ? new Date(dashboardLastRefreshIso).toLocaleString("en-UG", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="px-3 py-1.5 border-b border-border bg-card flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
      <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto min-w-0">
        <Satellite className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {isBundledSource ? "Bundled climate data" : "Live Climate TRACE"}
        </span>
        {health?.status === "ok" && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--on-track))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--on-track))] animate-pulse" />
            {health.latency_ms ?? "—"}ms
          </span>
        )}
        {health && health.status !== "ok" && (
          <span className="inline-flex items-center gap-1 text-[10px] text-[hsl(var(--at-risk))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--at-risk))]" />
            {health.status}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Skeleton className="skeleton-shimmer h-4 w-20" />
          <Skeleton className="skeleton-shimmer h-4 w-20" />
          <Skeleton className="skeleton-shimmer h-4 w-20" />
        </div>
      )}

      {data && (
        <>
          {!compact && (
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto min-w-0 shrink-0">
              {(
                Object.entries(data.sectors) as [
                  string,
                  { latest_year: number | null; latest_value: number | null; status: string },
                ][]
              ).map(([key, s]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className={cn("gap-1 text-[10px] h-5", STATUS_CLS[s.status] ?? STATUS_CLS.unknown)}
                  title={`Latest year: ${s.latest_year ?? "n/a"} • Climate TRACE`}
                >
                  <Activity className="h-2.5 w-2.5" />
                  {SECTOR_LABEL[key] ?? key.toUpperCase()}{" "}
                  <span className="font-mono">
                    {s.latest_value !== null ? `${s.latest_value.toFixed(1)} Mt` : "—"}
                  </span>
                </Badge>
              ))}
            </div>
          )}

          <div className="w-full sm:ml-auto sm:w-auto flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
            {data.global_rank != null && (
              <span>
                Global rank <span className="font-mono">#{data.global_rank}</span>
              </span>
            )}
            {data.total_co2e_mtco2e != null && (
              <span>
                Total <span className="font-mono">{data.total_co2e_mtco2e.toFixed(0)} Mt</span>
              </span>
            )}
            {recon?.sector_sum_mt != null && recon.reference_year && (
              <span title={recon.note}>
                Slug sum ({recon.reference_year}){" "}
                <span className="font-mono">{recon.sector_sum_mt.toFixed(1)} Mt</span>
                {recon.delta_mt != null && Math.abs(recon.delta_mt) > 0.01 && (
                  <span className="text-at-risk"> (Δ {recon.delta_mt})</span>
                )}
              </span>
            )}
            {data.data_stale && (
              <Badge variant="outline" className="h-4 text-[10px]">
                stale rankings
              </Badge>
            )}
            {data.from_cache && (
              <Badge variant="outline" className="h-4 text-[10px]">
                cached
              </Badge>
            )}
            {isBundledSource && (
              <Badge variant="outline" className="h-4 text-[10px]">
                bundled
              </Badge>
            )}
            {refreshLabel && <span title="Dashboard cache refresh">Updated {refreshLabel}</span>}
            {onOpenAccuracyDetails && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-primary"
                onClick={onOpenAccuracyDetails}
              >
                Accuracy details
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
