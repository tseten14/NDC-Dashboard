import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/hooks/use-app-state";
import { AlertCircle } from "lucide-react";
import { TargetStatusSummary } from "@/components/TargetStatusSummary";
import { DataCoveragePanel } from "@/components/DataCoveragePanel";
import { NDCTargetsColumn } from "@/components/columns/NDCTargets";
import { NDCActivitiesColumn } from "@/components/columns/NDCActivities";
import { ObservedDataColumn } from "@/components/columns/ObservedData";
import { ProgressTowardTargetColumn } from "@/components/columns/ProgressTowardTarget";
import { MitigationOptionsColumn } from "@/components/columns/MitigationOptions";
import { TopEmittingSources } from "@/components/TopEmittingSources";
import { DataTrackabilityPanel } from "@/components/DataTrackabilityPanel";
import { SpatialConfidencePanel } from "@/components/SpatialConfidencePanel";
import { OfficialSourcesPanel } from "@/components/OfficialSourcesPanel";
import { ndcTargets, sectorDefinitions, getDataCompleteness, getLastRefreshTimestamp } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, FileSpreadsheet, FileText, Database, Clock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportNdcDashboardExcel, exportNdcDashboardPdf, exportCrtBtrCsv } from "@/lib/ndc-export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SectorId, TimeMode, GeographyLevel } from "@/data/uganda-ndc-data";

export default function NDCLayer() {
  const state = useAppContext();
  const emissions = useEmissionsData();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep-link support: /dashboard?target=...&sector=...
  useEffect(() => {
    const t = searchParams.get("target");
    const s = searchParams.get("sector");
    if (s && s !== state.selectedSector) {
      state.setSelectedSector(s, { preserveTarget: Boolean(t) });
    }
    if (t && t !== state.selectedTargetId) state.setSelectedTargetId(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Auto-select a default district once the district list is available
  // (handles the case where District mode was toggled before the list loaded).
  useEffect(() => {
    if (
      state.geographyLevel === "district" &&
      !state.selectedDistrictId &&
      emissions.availableDistricts.length > 0
    ) {
      const preferred =
        emissions.availableDistricts.find((d) => d.name === "Kampala") ??
        emissions.availableDistricts[0];
      if (preferred) state.setSelectedDistrictId(preferred.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.geographyLevel, state.selectedDistrictId, emissions.availableDistricts]);

  const handleSelectTarget = useCallback((targetId: string) => {
    const target = ndcTargets.find((t) => t.id === targetId);
    if (!target) return;
    if (target.sectorId !== state.selectedSector) {
      state.setSelectedSector(target.sectorId, { preserveTarget: true });
    }
    state.setSelectedTargetId(targetId);
    setSearchParams({ target: targetId, sector: target.sectorId });
  }, [state, setSearchParams]);

  const handleSummarySelect = useCallback((targetId: string, sectorId: string) => {
    state.setSelectedSector(sectorId, { preserveTarget: true });
    state.setSelectedTargetId(targetId);
    setSearchParams({ target: targetId, sector: sectorId });
  }, [state, setSearchParams]);

  const selectedTarget = state.selectedTargetId
    ? ndcTargets.find(t => t.id === state.selectedTargetId) ?? null
    : null;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    toast.info("Refreshing Climate TRACE dashboard...");
    try {
      await queryClient.invalidateQueries({ queryKey: ["emissions"] });
      await queryClient.invalidateQueries({ queryKey: ["cockpit"] });
      toast.success("Dashboard data refreshed");
    } catch {
      toast.error("Refresh failed — check API health");
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const completeness = emissions.isApiReachable
    ? emissions.dashboardCompleteness
    : getDataCompleteness();
  const lastRefresh = emissions.isApiReachable
    ? emissions.dashboardLastRefreshIso
    : getLastRefreshTimestamp();
  const exportGeographyLabel =
    emissions.geography === "district" && emissions.districtName
      ? emissions.districtName
      : "national";

  const apiError = emissions.summaryError && !emissions.isApiReachable;

  return (
    <div className="flex flex-col h-full">
      {/* API error banner — visible, never swallowed */}
      {apiError && (
        <div
          className="px-3 py-2 bg-destructive/10 border-b border-destructive/30 flex items-center gap-2 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            Climate TRACE API unavailable. Displayed data may be stale or incomplete.
          </span>
          <button
            className="ml-auto underline underline-offset-2 hover:no-underline shrink-0"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}
      {/* NDC sub-controls */}
      <div className="px-3 py-1.5 border-b border-border bg-muted/30 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Sector</span>
          <Select value={state.selectedSector} onValueChange={(v) => state.setSelectedSector(v)}>
            <SelectTrigger className="w-[140px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {sectorDefinitions.map(s => <SelectItem key={s.id} value={s.id}><span className="text-xs">{s.name}</span></SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Geography</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => state.setGeographyLevel("national")}
              className={cn(
                "px-2 py-0.5 text-xs font-medium transition-colors",
                state.geographyLevel === "national"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              National
            </button>
            <button
              type="button"
              onClick={() => {
                state.setGeographyLevel("district");
                if (!state.selectedDistrictId) {
                  const list = emissions.availableDistricts;
                  const preferred = list.find((d) => d.name === "Kampala") ?? list[0];
                  if (preferred) state.setSelectedDistrictId(preferred.name);
                }
              }}
              className={cn(
                "px-2 py-0.5 text-xs font-medium transition-colors border-l border-input",
                state.geographyLevel === "district"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              District
            </button>
          </div>
          {state.geographyLevel === "district" && (
            <Select
              value={state.selectedDistrictId ?? ""}
              onValueChange={(v) => state.setSelectedDistrictId(v || null)}
            >
              <SelectTrigger className="w-[150px] h-7 text-xs">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {emissions.availableDistricts.map((d) => (
                  <SelectItem key={d.gadm_id} value={d.name}>
                    <span className="text-xs">{d.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Time</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["historical", "projection"] as const).map(m => (
              <button key={m} onClick={() => state.setTimeMode(m)}
                className={cn("px-2 py-0.5 text-xs font-medium transition-colors border-r border-input last:border-r-0",
                  state.timeMode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                )}>{m === "historical" ? "Historical" : "Projection"}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="gap-1 text-[10px] h-5"><Database className="h-2.5 w-2.5" />{completeness}%</Badge>
          <Badge variant="outline" className="gap-1 text-[10px] h-5"><Clock className="h-2.5 w-2.5" />{new Date(lastRefresh).toLocaleDateString("en-UG", { day: "numeric", month: "short" })}</Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1 h-7 text-xs">
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"><Download className="h-3 w-3" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  exportNdcDashboardExcel(emissions);
                  toast.success(`Excel exported (${exportGeographyLabel})`);
                }}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportNdcDashboardPdf(emissions);
                  toast.success(`PDF exported (${exportGeographyLabel})`);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />Summary PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  exportCrtBtrCsv(emissions);
                  toast.success(`CRT/BTR CSV exported (${exportGeographyLabel})`);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />CRT/BTR CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DataCoveragePanel />

      {/* Target Status Summary — 'all targets first' anchor */}
      <TargetStatusSummary onSelectTarget={handleSummarySelect} />

      {/* Three-column layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden">
        <div className="overflow-hidden">
          <NDCTargetsColumn selectedSector={state.selectedSector as SectorId} selectedTargetId={state.selectedTargetId} onSelectTarget={handleSelectTarget} />
        </div>
        <div className="overflow-hidden">
          <ObservedDataColumn selectedTarget={selectedTarget} timeMode={state.timeMode as TimeMode} selectedMitigationOptions={state.selectedMitigationOptions} />
        </div>
        <div className="overflow-hidden flex flex-col">
          <div className="overflow-hidden">
            <ProgressTowardTargetColumn selectedTarget={selectedTarget} />
          </div>
          <div className="shrink-0 px-3 py-2 border-t border-border bg-muted/20 space-y-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  📋 Activities / Measures
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-4 py-3 border-b border-border">
                  <DialogTitle className="text-sm">Activities / Measures</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <NDCActivitiesColumn
                    selectedTargetId={state.selectedTargetId}
                    geographyLevel={state.geographyLevel as GeographyLevel}
                    selectedDistrictId={state.selectedDistrictId}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  🏭 Top Emitting Sources
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-4 py-3 border-b border-border">
                  <DialogTitle className="text-sm">Top Emitting Sources (Climate TRACE)</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <TopEmittingSources />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  🛰️ Spatial Certainty
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl h-[80vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-4 py-3 border-b border-border">
                  <DialogTitle className="text-sm">Spatial Certainty (Climate TRACE)</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <SpatialConfidencePanel />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  📡 What Climate TRACE Can Track
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-4 py-3 border-b border-border">
                  <DialogTitle className="text-sm">NDC Trackability (Climate TRACE)</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <DataTrackabilityPanel />
                </div>
              </DialogContent>
            </Dialog>

            <OfficialSourcesPanel sectorId={state.selectedSector as SectorId} />

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  💡 Mitigation Options
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-4 py-3 border-b border-border">
                  <DialogTitle className="text-sm">Mitigation Options</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0">
                  <MitigationOptionsColumn
                    selectedTarget={selectedTarget}
                    selectedSector={state.selectedSector as SectorId}
                    timeMode={state.timeMode as TimeMode}
                    selectedMitigationOptions={state.selectedMitigationOptions}
                    onToggleMitigationOption={state.toggleMitigationOption}
                    decisionLog={state.decisionLog}
                    onAddToDecisionLog={state.addToDecisionLog}
                    onUpdateDecisionStatus={state.updateDecisionStatus}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
