import { useState } from "react";
import {
  type NDCTarget, type SectorId, type TimeMode, type MitigationOption,
  type DecisionLogEntry, type DecisionStatus,
  getMitigationOptionsForTarget,
} from "@/data/uganda-ndc-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, FlaskConical, Plus, DollarSign, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEmissionsData } from "@/context/EmissionsDataContext";

interface MitigationOptionsProps {
  selectedTarget: NDCTarget | null;
  selectedSector: SectorId;
  timeMode: TimeMode;
  selectedMitigationOptions: string[];
  onToggleMitigationOption: (id: string) => void;
  decisionLog: DecisionLogEntry[];
  onAddToDecisionLog: (entry: Omit<DecisionLogEntry, "id" | "date">) => void;
  onUpdateDecisionStatus: (entryId: string, status: DecisionStatus) => void;
}

const confidenceColors: Record<string, string> = {
  low: "bg-off-track/10 text-off-track border-off-track/30",
  medium: "bg-at-risk/10 text-at-risk border-at-risk/30",
  high: "bg-on-track/10 text-on-track border-on-track/30",
};

export function MitigationOptionsColumn({
  selectedTarget, selectedSector, timeMode,
  selectedMitigationOptions, onToggleMitigationOption,
  decisionLog, onAddToDecisionLog, onUpdateDecisionStatus,
}: MitigationOptionsProps) {
  const emissions = useEmissionsData();

  if (!selectedTarget) {
    return <EmptyState />;
  }

  let options = getMitigationOptionsForTarget(selectedTarget.id, selectedSector);
  const fromCatalog = emissions.getMitigationFromCatalog(selectedTarget.id, selectedSector);
  if (fromCatalog.length > 0) {
    options = fromCatalog;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Mitigation Options</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{options.length} option{options.length !== 1 ? "s" : ""}</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {options.map(option => (
            <OptionCard
              key={option.id}
              option={option}
              timeMode={timeMode}
              isSelected={selectedMitigationOptions.includes(option.id)}
              onToggle={() => onToggleMitigationOption(option.id)}
              onAddToLog={() => {
                onAddToDecisionLog({
                  optionId: option.id,
                  optionTitle: option.title,
                  status: "shortlisted",
                  rationale: "",
                });
                toast.success(`"${option.title}" added to decision log`);
              }}
            />
          ))}

          {options.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 text-center">No mitigation options available for this target.</p>
          )}

          {/* Decision Log */}
          {decisionLog.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Decision Log</h4>
              {decisionLog.map(entry => (
                <DecisionLogCard key={entry.id} entry={entry} onUpdateStatus={onUpdateDecisionStatus} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function OptionCard({ option, timeMode, isSelected, onToggle, onAddToLog }: {
  option: MitigationOption; timeMode: TimeMode; isSelected: boolean; onToggle: () => void; onAddToLog: () => void;
}) {
  return (
    <Card className={cn("transition-all", isSelected && "ring-2 ring-accent")}>
      <CardContent className="p-3">
        <h4 className="text-xs font-semibold text-foreground">{option.title}</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{option.description}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
            <BarChart3 className="h-2.5 w-2.5" />
            {option.emissionsReductionPotential} {option.emissionsReductionUnit}
          </Badge>
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5">
            <DollarSign className="h-2.5 w-2.5" />
            {option.costCurrency} {option.costEstimate} {option.costMagnitude}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] h-4", confidenceColors[option.confidence])}>
            {option.confidence.charAt(0).toUpperCase() + option.confidence.slice(1)} confidence
          </Badge>
        </div>

        <div className="flex gap-1 mt-2">
          {/* Best practice modal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-[9px] gap-0.5 flex-1">
                <BookOpen className="h-2.5 w-2.5" />Best practice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-sm">Best Practices: {option.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                {option.bestPractices.map((bp, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px] h-4">{bp.country}</Badge>
                      <span className="text-xs font-medium">{bp.title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{bp.description}</p>
                    <p className="text-[10px] text-on-track font-medium mt-1">Outcome: {bp.outcome}</p>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Apply to scenario */}
          <Button
            variant={isSelected ? "default" : "outline"}
            size="sm"
            className="h-6 text-[9px] gap-0.5 flex-1"
            disabled={timeMode !== "projection"}
            onClick={onToggle}
          >
            <FlaskConical className="h-2.5 w-2.5" />
            {isSelected ? "Applied" : "Apply to scenario"}
          </Button>

          {/* Add to log */}
          <Button variant="outline" size="sm" className="h-6 text-[9px] gap-0.5" onClick={onAddToLog}>
            <Plus className="h-2.5 w-2.5" />Log
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionLogCard({ entry, onUpdateStatus }: {
  entry: DecisionLogEntry; onUpdateStatus: (id: string, status: DecisionStatus) => void;
}) {
  const statusColors: Record<string, string> = {
    shortlisted: "bg-chart-4/10 text-chart-4 border-chart-4/30",
    approved: "bg-on-track/10 text-on-track border-on-track/30",
    rejected: "bg-off-track/10 text-off-track border-off-track/30",
  };

  return (
    <div className="p-2 rounded-md bg-muted/30 mb-1.5 flex items-center justify-between gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-foreground truncate">{entry.optionTitle}</p>
        <p className="text-[9px] text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
      </div>
      <Select value={entry.status} onValueChange={(v) => onUpdateStatus(entry.id, v as DecisionStatus)}>
        <SelectTrigger className={cn("h-5 w-[90px] text-[9px] border", statusColors[entry.status])}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="shortlisted"><span className="text-[10px]">Shortlisted</span></SelectItem>
          <SelectItem value="approved"><span className="text-[10px]">Approved</span></SelectItem>
          <SelectItem value="rejected"><span className="text-[10px]">Rejected</span></SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-muted/50">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Mitigation Options</h3>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">Select a target to view options</p>
      </div>
    </div>
  );
}
