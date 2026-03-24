import { useState, useCallback } from "react";
import { useAppContext } from "@/hooks/use-app-state";
import { NDCTargetsColumn } from "@/components/columns/NDCTargets";
import { NDCActivitiesColumn } from "@/components/columns/NDCActivities";
import { ObservedDataColumn } from "@/components/columns/ObservedData";
import { ProgressTowardTargetColumn } from "@/components/columns/ProgressTowardTarget";
import { MitigationOptionsColumn } from "@/components/columns/MitigationOptions";
import { ndcTargets, sectorDefinitions, getDataCompleteness, getLastRefreshTimestamp } from "@/data/uganda-ndc-data";
import { ugandaDistricts } from "@/data/uganda-districts";
import { progressRecords } from "@/data/uganda-strategy-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, FileSpreadsheet, FileText, Database, Clock, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportToExcel, exportToPDF } from "@/lib/export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SectorId, TimeMode, GeographyLevel } from "@/data/uganda-ndc-data";

export default function NDCLayer() {
  const state = useAppContext();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedTarget = state.selectedTargetId
    ? ndcTargets.find(t => t.id === state.selectedTargetId) ?? null
    : null;

  // Check if any linked KPI has Preliminary status
  const hasPreliminary = progressRecords.some(p => p.validation_status === "Preliminary");

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    toast.info("Fetching latest data from sector APIs...");
    setTimeout(() => { setIsRefreshing(false); toast.success("Dashboard data refreshed"); }, 1500);
  }, []);

  const completeness = getDataCompleteness();
  const lastRefresh = getLastRefreshTimestamp();

  return (
    <div className="flex flex-col h-full">
      {/* NDC sub-controls */}
      <div className="px-3 py-1.5 border-b border-border bg-muted/30 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Sector</span>
          <Select value={state.selectedSector} onValueChange={(v) => state.setSelectedSector(v)}>
            <SelectTrigger className="w-[140px] h-6 text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sectorDefinitions.map(s => <SelectItem key={s.id} value={s.id}><span className="text-xs">{s.name}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Geography</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["national", "district"] as const).map(g => (
              <button key={g} onClick={() => state.setGeographyLevel(g)}
                className={cn("px-2 py-0.5 text-[10px] font-medium transition-colors border-r border-input last:border-r-0",
                  state.geographyLevel === g ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                )}>{g === "national" ? "National" : "District"}</button>
            ))}
          </div>
          {state.geographyLevel === "district" && (
            <Select value={state.selectedDistrictId || ""} onValueChange={(v) => state.setSelectedDistrictId(v || null)}>
              <SelectTrigger className="w-[120px] h-6 text-[10px]"><SelectValue placeholder="District..." /></SelectTrigger>
              <SelectContent className="max-h-[300px]">{ugandaDistricts.map(d => <SelectItem key={d} value={d}><span className="text-xs">{d}</span></SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Time</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["historical", "projection"] as const).map(m => (
              <button key={m} onClick={() => state.setTimeMode(m)}
                className={cn("px-2 py-0.5 text-[10px] font-medium transition-colors border-r border-input last:border-r-0",
                  state.timeMode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                )}>{m === "historical" ? "Historical" : "Projection"}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="gap-1 text-[9px] h-5"><Database className="h-2.5 w-2.5" />{completeness}%</Badge>
          <Badge variant="outline" className="gap-1 text-[9px] h-5"><Clock className="h-2.5 w-2.5" />{new Date(lastRefresh).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}</Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1 h-6 text-[10px]">
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-6 text-[10px]"><Download className="h-3 w-3" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { exportToExcel(); toast.success("Excel exported"); }}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { exportToPDF(); toast.success("PDF exported"); }}><FileText className="h-4 w-4 mr-2" />Key Stats PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("CRT/BTR CSV export coming soon")}><FileText className="h-4 w-4 mr-2" />CRT/BTR CSV</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Validation Gate Banner */}
      {hasPreliminary && (
        <div className="px-3 py-1 bg-at-risk/10 border-b border-at-risk/30 flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-at-risk" />
          <span className="text-[10px] text-at-risk font-medium">⚠ Preliminary data — some KPIs not yet verified by sector MRV authority</span>
        </div>
      )}

      {/* Five-column layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden">
        <div className="overflow-hidden">
          <NDCTargetsColumn selectedSector={state.selectedSector as SectorId} selectedTargetId={state.selectedTargetId} onSelectTarget={state.setSelectedTargetId} />
        </div>
        <div className="overflow-hidden">
          <NDCActivitiesColumn selectedTargetId={state.selectedTargetId} geographyLevel={state.geographyLevel as GeographyLevel} selectedDistrictId={state.selectedDistrictId} />
        </div>
        <div className="overflow-hidden">
          <ObservedDataColumn selectedTarget={selectedTarget} timeMode={state.timeMode as TimeMode} selectedMitigationOptions={state.selectedMitigationOptions} />
        </div>
        <div className="overflow-hidden">
          <ProgressTowardTargetColumn selectedTarget={selectedTarget} />
        </div>
        <div className="overflow-hidden">
          <MitigationOptionsColumn selectedTarget={selectedTarget} selectedSector={state.selectedSector as SectorId} timeMode={state.timeMode as TimeMode}
            selectedMitigationOptions={state.selectedMitigationOptions} onToggleMitigationOption={state.toggleMitigationOption}
            decisionLog={state.decisionLog} onAddToDecisionLog={state.addToDecisionLog} onUpdateDecisionStatus={state.updateDecisionStatus} />
        </div>
      </div>
    </div>
  );
}
