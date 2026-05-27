import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ndcTargets, ndcActivities, getObservedDataForTarget, type NDCTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { getClimateTraceSectorForTarget } from "@/lib/emissions-integration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Library, AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const snapshots = useMemo((): TargetSnapshot[] => {
    return ndcTargets.map(t => {
      const acts = ndcActivities.filter(a => a.targetId === t.id);
      const obs = getObservedDataForTarget(t.id);
      const { status } = emissions.getProgressForTarget(t);

      const apiSector = getClimateTraceSectorForTarget(t);
      const hasApiData =
        !!apiSector &&
        emissions.getObservedMode(t) === "live" &&
        !emissions.sectorError[apiSector];

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

  return (
    <div className="px-3 py-2 border-b border-border bg-muted/20">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Stat icon={<CheckCircle2 className="h-3 w-3 text-on-track" />} label="On-track" value={onTrack} />
          <Stat icon={<AlertTriangle className="h-3 w-3 text-off-track" />} label="Off-track" value={offTrack} />
          <Stat icon={<Database className="h-3 w-3 text-at-risk" />} label="Impl. gaps" value={implGaps} hint="Targets with 0 mapped activities" />
          <Stat icon={<Database className="h-3 w-3 text-muted-foreground" />} label="MRV gaps" value={mrvGaps} hint="Targets missing observed data" />
        </div>

        <div className="flex items-center gap-1.5 flex-1 min-w-0 touch-scroll-x">
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold shrink-0">Top gaps</span>
          {topGaps.length === 0 && (
            <span className="text-[10px] text-muted-foreground">No gaps detected</span>
          )}
          {topGaps.map(s => (
            <button
              key={s.target.id}
              onClick={() => onSelectTarget(s.target.id, s.target.sectorId)}
              className="group flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:border-primary hover:bg-primary/5 transition-colors shrink-0"
              title={s.target.targetText}
            >
              <GapBadge kind={s.gap} />
              <span className="text-[10px] font-medium truncate max-w-[180px]">
                {s.target.sectorId.toUpperCase()} · {s.target.targetText.slice(0, 40)}…
              </span>
              <ChevronRight className="h-2.5 w-2.5 text-muted-foreground group-hover:text-primary" />
            </button>
          ))}
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

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-background border border-border" title={hint}>
      {icon}
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-[11px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

function GapBadge({ kind }: { kind: GapKind }) {
  const cls = cn(
    "text-[8px] uppercase tracking-wide px-1 py-0 h-3.5 leading-none",
    kind === "implementation" && "bg-at-risk/15 text-at-risk border-at-risk/30",
    kind === "delivery" && "bg-off-track/15 text-off-track border-off-track/30",
    kind === "mrv" && "bg-muted text-muted-foreground border-border",
  );
  const label = kind === "implementation" ? "Impl" : kind === "delivery" ? "Off" : "MRV";
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}
