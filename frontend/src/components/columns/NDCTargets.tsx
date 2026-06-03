import { useEffect, useMemo, useState } from "react";
import { type NDCTarget, type SectorId, getTargetsForSector, sectorDefinitions, getObservedDataForTarget } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { DataLineageChip } from "@/components/DataLineageChip";
import { buildTargetLineage } from "@/lib/lineage";
import { getClimateTraceSectorForTarget } from "@/lib/emissions-integration";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import { toast } from "sonner";

interface NDCTargetsProps {
  selectedSector: SectorId;
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
}

const conditionalityColors: Record<string, string> = {
  Unconditional: "bg-on-track/15 text-on-track border-on-track/30",
  Conditional: "bg-at-risk/15 text-at-risk border-at-risk/30",
  Mixed: "bg-chart-4/15 text-chart-4 border-chart-4/30",
};

const metricLabels: Record<string, string> = {
  "emissions-reduction": "Emissions Reduction",
  "forest-cover": "Forest Cover",
  "renewable-energy": "Renewable Energy",
  "waste-diversion": "Waste Diversion",
  "energy-efficiency": "Energy Efficiency",
  "transport-modal-shift": "Modal Shift",
  "climate-resilience": "Climate Resilience",
  "activity-share": "Activity Share",
};

export function NDCTargetsColumn({ selectedSector, selectedTargetId, onSelectTarget }: NDCTargetsProps) {
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(selectedTargetId);
  const targets = getTargetsForSector(selectedSector);

  useEffect(() => {
    if (selectedTargetId) setExpandedTargetId(selectedTargetId);
  }, [selectedTargetId]);

  const grouped = selectedSector === "economy-wide"
    ? sectorDefinitions.filter(s => s.id !== "economy-wide").map(s => ({
        sector: s,
        targets: targets.filter(t => t.sectorId === s.id),
      })).filter(g => g.targets.length > 0)
    : [{ sector: sectorDefinitions.find(s => s.id === selectedSector)!, targets }];

  const handleShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Copied!", { duration: 2000 });
    } catch {
      toast.error("Could not copy URL");
    }
  };

  const handleTargetClick = (targetId: string) => {
    onSelectTarget(targetId);
    setExpandedTargetId(targetId);
  };

  const handleToggleExpand = (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedTargetId !== targetId) {
      onSelectTarget(targetId);
      setExpandedTargetId(targetId);
      return;
    }
    setExpandedTargetId((prev) => (prev === targetId ? null : targetId));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">NDC Targets</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">{targets.length} target{targets.length !== 1 ? "s" : ""}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1 shrink-0"
            onClick={handleShareUrl}
            title="Copy shareable link to this target"
          >
            <Link2 className="h-3 w-3" />
            Share
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {grouped.map(({ sector, targets: sectorTargets }) => (
            <div key={sector.id}>
              {selectedSector === "economy-wide" && (
                <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                  <sector.icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{sector.name}</span>
                </div>
              )}
              {sectorTargets.map(target => (
                <TargetCard
                  key={target.id}
                  target={target}
                  isActive={selectedTargetId === target.id}
                  isExpanded={expandedTargetId === target.id}
                  onClick={() => handleTargetClick(target.id)}
                  onToggleExpand={(e) => handleToggleExpand(target.id, e)}
                />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TargetCard({
  target,
  isActive,
  isExpanded,
  onClick,
  onToggleExpand,
}: {
  target: NDCTarget;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onToggleExpand: (e: React.MouseEvent) => void;
}) {
  const emissions = useEmissionsData();
  const { source } = emissions.getProgressForTarget(target);
  const lineage = buildTargetLineage(target, emissions, source);

  const sparkPoints = useMemo(() => {
    const apiSector = getClimateTraceSectorForTarget(target);
    const live = apiSector ? emissions.timeseriesBySector[apiSector]?.timeseries : undefined;
    if (live?.length) {
      return live.filter((p) => p.value != null).map((p) => ({ year: p.year, value: p.value as number }));
    }
    const obs = getObservedDataForTarget(target.id);
    return (obs?.historicalData ?? [])
      .filter((p) => p.value != null)
      .map((p) => ({ year: p.year, value: p.value as number }));
  }, [target, emissions.timeseriesBySector]);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md mb-2",
        isActive
          ? "ring-2 ring-accent border-accent shadow-md"
          : "hover:border-muted-foreground/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1">
          <button
            type="button"
            className="shrink-0 mt-0.5 rounded p-0.5 hover:bg-muted"
            aria-label={isExpanded ? "Collapse target details" : "Expand target details"}
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          <blockquote className="text-xs leading-relaxed text-foreground italic border-l-2 border-accent pl-2 mb-2 flex-1 line-clamp-2">
            &ldquo;{target.targetText}&rdquo;
          </blockquote>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          <Badge variant="outline" className="text-[9px] h-4 px-1.5">
            {target.targetYear}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 border", conditionalityColors[target.conditionality])}>
            {target.conditionality}
          </Badge>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-secondary">
            {metricLabels[target.metricType]}
          </Badge>
        </div>
        <div className="mt-2 text-[10px] text-muted-foreground flex flex-wrap items-center gap-1">
          <span>{target.baselineValue} → {target.targetValue} {target.unit}</span>
          <DataLineageChip lineage={lineage} />
        </div>

        {isExpanded && (
          <div
            className="mt-3 pt-3 border-t border-border space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-foreground leading-relaxed">{target.targetText}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Historical trend</span>
              <TargetSparkline points={sparkPoints} />
            </div>
            <DataLineageChip lineage={lineage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TargetSparkline({ points }: { points: { year: number; value: number }[] }) {
  if (points.length < 2) {
    return <span className="text-[10px] text-muted-foreground">Not enough data points</span>;
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const w = 120;
  const h = 32;
  const coords = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p.value - min) / (max - min || 1)) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} aria-hidden className="shrink-0">
      <polyline
        fill="none"
        stroke="hsl(var(--chart-4))"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={coords}
      />
    </svg>
  );
}
