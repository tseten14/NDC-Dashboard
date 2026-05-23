import { Activity, Satellite, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { cn } from "@/lib/utils";

const SECTOR_LABEL: Record<string, string> = {
  afolu: "AFOLU",
  energy: "ENERGY",
  ippu: "IPPU",
  agriculture: "AGRICULTURE",
  waste: "WASTE",
};

const STATUS_CLS: Record<string, string> = {
  on_track: "bg-on-track/15 text-[hsl(var(--on-track))] border-[hsl(var(--on-track))]/30",
  at_risk: "bg-at-risk/15 text-[hsl(var(--at-risk))] border-[hsl(var(--at-risk))]/30",
  mixed: "bg-at-risk/15 text-[hsl(var(--at-risk))] border-[hsl(var(--at-risk))]/30",
  off_track: "bg-off-track/15 text-[hsl(var(--off-track))] border-[hsl(var(--off-track))]/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

export function LiveEmissionsBanner() {
  const { summary: data, summaryIsLoading: isLoading, summaryError: error, health } = useEmissionsData();

  if (error) {
    const isDev = import.meta.env.DEV;
    return (
      <div className="px-3 py-1.5 border-b border-border bg-destructive/5 flex items-center gap-2">
        <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
        <span className="text-[10px] text-destructive leading-snug">
          {isDev ? (
            <>
              Live emissions API unreachable. Start it with{" "}
              <code className="font-mono">npm run start:api</code>
            </>
          ) : (
            <>
              Emissions API unavailable ({error.message || "request failed"}). Check{" "}
              <a href="/api/health" className="underline font-medium" target="_blank" rel="noreferrer">
                /api/health
              </a>{" "}
              after redeploy, or set <code className="font-mono">USE_MOCK_DATA=true</code> on Vercel.
            </>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 py-1.5 border-b border-border bg-card flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Satellite className="h-3 w-3 text-primary" />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
          Live Climate TRACE
        </span>
        {health?.status === "ok" && (
          <span className="inline-flex items-center gap-1 text-[9px] text-[hsl(var(--on-track))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--on-track))] animate-pulse" />
            {health.latency_ms ?? "—"}ms
          </span>
        )}
        {health && health.status !== "ok" && (
          <span className="inline-flex items-center gap-1 text-[9px] text-[hsl(var(--at-risk))]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--at-risk))]" />
            {health.status}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.entries(data.sectors) as [string, { latest_year: number | null; latest_value: number | null; status: string }][]).map(
              ([key, s]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className={cn("gap-1 text-[9px] h-5", STATUS_CLS[s.status] ?? STATUS_CLS.unknown)}
                  title={`Latest year: ${s.latest_year ?? "n/a"} • Climate TRACE v7`}
                >
                  <Activity className="h-2.5 w-2.5" />
                  {SECTOR_LABEL[key] ?? key.toUpperCase()}{" "}
                  <span className="font-mono">
                    {s.latest_value !== null ? `${s.latest_value.toFixed(1)} Mt` : "—"}
                  </span>
                </Badge>
              ),
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 text-[9px] text-muted-foreground">
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
            {data.from_cache && (
              <Badge variant="outline" className="h-4 text-[8px]">cached</Badge>
            )}
          </div>
        </>
      )}
    </div>
  );
}
