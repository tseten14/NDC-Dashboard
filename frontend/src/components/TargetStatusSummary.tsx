import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ndcTargets, ndcActivities, getObservedDataForTarget, type NDCTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { getClimateTraceSectorForTarget } from "@/lib/emissions-integration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Library, AlertTriangle, CheckCircle2, Database, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTargetPlainLanguage } from "@/lib/target-plain-language";
import { CountUpNumber } from "@/components/dashboard/CountUpNumber";

interface TargetStatusSummaryProps {
  onSelectTarget: (targetId: string, sectorId: string) => void;
}

type GapKind = "implementation" | "mrv" | "delivery" | "ok";

interface TargetSnapshot {
  target: NDCTarget;
  activitiesCount: number;
  hasData: boolean;
  status: "on-track" | "at-risk" | "off-track" | "unknown";
  gap: GapKind;
}

export function TargetStatusSummary({ onSelectTarget }: TargetStatusSummaryProps) {
  const emissions = useEmissionsData();
  const isLoading = emissions.summaryIsLoading;
  const hasError = !!emissions.summaryError && !emissions.isApiReachable;

  const snapshots = useMemo((): TargetSnapshot[] => {
    return ndcTargets.map(t => {
      const acts = ndcActivities.filter(a => a.targetId === t.id);
      const obs = getObservedDataForTarget(t.id);
      const { status } = emissions.getProgressForTarget(t);

      const apiSector = getClimateTraceSectorForTarget(t);
      const hasApiData =
        !!apiSector &&
        !emissions.sectorError[apiSector] &&
        (emissions.timeseriesBySector[apiSector]?.timeseries.some((p) => p.value != null) ?? false);

      const hasData =
        hasApiData ||
        (!!obs && obs.historicalData.length > 0 && obs.provenance.qaqcStatus !== "missing");

      let gap: GapKind = "ok";
      if (acts.length === 0) gap = "implementation";
      else if (!hasData) gap = "mrv";
      else if (status === "off-track" || status === "at-risk") gap = "delivery";
      return { target: t, activitiesCount: acts.length, hasData, status, gap };
    });
  }, [emissions]);

  const onTrack = snapshots.filter(s => s.status === "on-track").length;
  const offTrack = snapshots.filter(s => s.status === "off-track" || s.status === "at-risk").length;
  const implGaps = snapshots.filter(s => s.gap === "implementation").length;
  const mrvGaps = snapshots.filter(s => s.gap === "mrv").length;

  const priority: Record<GapKind, number> = { implementation: 3, delivery: 2, mrv: 1, ok: 0 };
  const topGaps = [...snapshots]
    .filter(s => s.gap !== "ok")
    .sort((a, b) => priority[b.gap] - priority[a.gap])
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="px-3 py-2 border-b border-border bg-muted/20" aria-busy="true" aria-label="Loading status summary">
        <div className="flex items-center gap-3 flex-wrap">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-5 w-20 rounded" />)}
          <Skeleton className="h-5 w-40 rounded ml-2" />
        </div>
      </div>
    );
  }

  if (!isLoading && !hasError && snapshots.length === 0) {
    return (
      <div className="px-3 py-2 border-b border-border bg-muted/20" role="status">
        <p className="text-xs text-muted-foreground">No NDC targets found. Please check the data configuration.</p>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="px-3 py-2 border-b border-border bg-destructive/5" role="alert">
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          Climate TRACE API unavailable — status summary cannot be calculated.
          <button
            className="ml-1 underline underline-offset-2 hover:no-underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 border-b border-border dash-section-header">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Stat icon={<CheckCircle2 className="h-3 w-3 text-on-track" />} label="On-track" value={onTrack} index={0} />
          <Stat icon={<AlertTriangle className="h-3 w-3 text-off-track" />} label="Off-track" value={offTrack} index={1} />
          <Stat icon={<Database className="h-3 w-3 text-muted-foreground" />} label="Activity gaps" value={implGaps} hint="Targets with no linked activities" index={2} />
          <Stat icon={<Database className="h-3 w-3 text-muted-foreground" />} label="Data gaps" value={mrvGaps} hint="Targets missing observed data" index={3} />
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0 touch-scroll-x">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">Top gaps</span>
          {topGaps.length === 0 && (
            <span className="text-[10px] text-muted-foreground">No gaps detected</span>
          )}
          {topGaps.map((s, i) => {
            const plain = getTargetPlainLanguage(s.target);
            return (
            <button
              key={s.target.id}
              onClick={() => onSelectTarget(s.target.id, s.target.sectorId)}
              className="group flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:border-primary hover:bg-primary/5 transition-colors shrink-0 dash-fade-up"
              style={{ animationDelay: `${0.2 + i * 0.07}s` }}
              title={plain.summary}
            >
              <GapBadge kind={s.gap} />
              <span className="text-[10px] font-medium truncate max-w-[180px]">
                {s.target.sectorId.toUpperCase()} · {plain.summary.slice(0, 48)}…
              </span>
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary" />
            </button>
          );
          })}
        </div>

        <Button asChild size="sm" variant="outline" className="h-6 text-[10px] gap-1 shrink-0">
          <Link to="/library">
            <Library className="h-3 w-3" />
            Browse Strategy Library
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint, index = 0 }: { icon: React.ReactNode; label: string; value: number; hint?: string; index?: number }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border shadow-sm dash-fade-up dash-card-hover"
      style={{ animationDelay: `${index * 0.07}s` }}
      title={hint}
    >
      {icon}
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <CountUpNumber value={value} className="text-[11px] font-bold tabular-nums" />
    </div>
  );
}

function GapBadge({ kind }: { kind: GapKind }) {
  const cls = cn(
    "text-[8px] uppercase tracking-wide px-1 py-0 h-3.5 leading-none",
    kind === "implementation" && "bg-muted text-muted-foreground border-border",
    kind === "delivery" && "bg-off-track/15 text-off-track border-off-track/30",
    kind === "mrv" && "bg-muted text-muted-foreground border-border",
  );
  const label = kind === "implementation" ? "Impl" : kind === "delivery" ? "Off" : "MRV";
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}
