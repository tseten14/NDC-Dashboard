import { type NDCTarget, type SectorId, getTargetsForSector, sectorDefinitions } from "@/data/uganda-ndc-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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
};

export function NDCTargetsColumn({ selectedSector, selectedTargetId, onSelectTarget }: NDCTargetsProps) {
  const targets = getTargetsForSector(selectedSector);

  // Group by sector for economy-wide view
  const grouped = selectedSector === "economy-wide"
    ? sectorDefinitions.filter(s => s.id !== "economy-wide").map(s => ({
        sector: s,
        targets: targets.filter(t => t.sectorId === s.id),
      })).filter(g => g.targets.length > 0)
    : [{ sector: sectorDefinitions.find(s => s.id === selectedSector)!, targets }];

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">NDC Targets</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{targets.length} target{targets.length !== 1 ? "s" : ""}</p>
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
                  onClick={() => onSelectTarget(target.id)}
                />
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TargetCard({ target, isActive, onClick }: { target: NDCTarget; isActive: boolean; onClick: () => void }) {
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
        <blockquote className="text-xs leading-relaxed text-foreground italic border-l-2 border-accent pl-2 mb-2">
          "{target.targetText}"
        </blockquote>
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
        <div className="mt-2 text-[10px] text-muted-foreground">
          {target.baselineValue} → {target.targetValue} {target.unit}
        </div>
      </CardContent>
    </Card>
  );
}
