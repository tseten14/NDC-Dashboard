import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAppContext } from "@/hooks/use-app-state";
import { useCurrentRole } from "@/hooks/use-current-role";
import { DASHBOARD_MODE_LABELS, getDashboardPresets } from "@/lib/role-capabilities";
import { AlertCircle } from "lucide-react";
import { NdcGapSummary } from "@/components/NdcGapSummary";
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
import { ndcTargets, sectorDefinitions } from "@/data/uganda-ndc-data";
import { useEmissionsData } from "@/context/EmissionsDataContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileSpreadsheet, FileText, Sparkles, LayoutList, Activity, TrendingUp } from "lucide-react";
import { DashboardAnalyzePanel } from "@/components/dashboard/DashboardAnalyzePanel";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportNdcDashboardExcel, exportNdcDashboardPdf, exportCrtBtrCsv } from "@/lib/ndc-export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SectorId, TimeMode, GeographyLevel } from "@/data/uganda-ndc-data";

export default function NDCLayer() {
  const state = useAppContext();
  const emissions = useEmissionsData();
  const queryClient = useQueryClient();
  const { activeRole, getDashboardMode, canExport, isReadOnly } = useCurrentRole();
  const dashboardMode = getDashboardMode();
  const dashboardPresets = getDashboardPresets(activeRole);
  const readOnly = isReadOnly();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // Which detail panel (opened from the "Data & insights" menu) is showing.
  const [activePanel, setActivePanel] = useState<string | null>(null);

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

  // Re-apply dashboard presets whenever the active role changes.
  useEffect(() => {
    if (!activeRole) return;

    if (state.geographyLevel !== dashboardPresets.geographyLevel) {
      state.setGeographyLevel(dashboardPresets.geographyLevel);
    }

    if (dashboardPresets.sector && state.selectedSector !== dashboardPresets.sector) {
      state.setSelectedSector(dashboardPresets.sector);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("sector", dashboardPresets.sector!);
        next.delete("target");
        return next;
      });
    }

    if (!dashboardPresets.emphasizeMrvPanels) {
      setActivePanel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole]);

  const handleSelectTarget = useCallback((targetId: string) => {
    const target = ndcTargets.find((t) => t.id === targetId);
    if (!target) return;
    if (target.sectorId !== state.selectedSector) {
      state.setSelectedSector(target.sectorId, { preserveTarget: true });
    }
    state.setSelectedTargetId(targetId);
    setSearchParams({ target: targetId, sector: target.sectorId });
  }, [state, setSearchParams]);

  const handleGapSectorSelect = useCallback((sectorId: string) => {
    state.setSelectedSector(sectorId);
    setSearchParams({ sector: sectorId });
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
      {dashboardMode === "mrv" && (
        <div className="px-3 py-1.5 border-b border-primary/20 bg-primary/5 text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">MRV view:</span> AFOLU sector selected; spatial certainty and trackability tools highlighted below. Use Export for CRT/BTR CSV.
        </div>
      )}
      {dashboardMode === "briefing" && (
        <div className="px-3 py-1.5 border-b border-border bg-muted/40 text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">Briefing view:</span> national geography locked; PDF export only; mitigation edits disabled.
        </div>
      )}
      {dashboardMode === "field" && (
        <div className="px-3 py-1.5 border-b border-emerald-500/20 bg-emerald-500/5 text-[10px] text-muted-foreground">
          <span className="font-semibold text-foreground">Field view:</span> district geography selected — use district selector and Emissions Map for local context.
        </div>
      )}

      {/* NDC sub-controls */}
      <div className="px-3 py-2 border-b border-border dash-section-header flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="h-6 text-[10px] font-semibold shrink-0">
          {DASHBOARD_MODE_LABELS[dashboardMode]} mode
        </Badge>

        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Sector</span>
          <Select value={state.selectedSector} onValueChange={(v) => state.setSelectedSector(v)}>
            <SelectTrigger className="w-[140px] h-7 text-xs">
              <span className="truncate">
                {sectorDefinitions.find((s) => s.id === state.selectedSector)?.name ?? "Sector"}
              </span>
            </SelectTrigger>
            <SelectContent>
              {sectorDefinitions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex flex-col">
                    <span className="text-xs">{s.name}</span>
                    {s.description && s.description !== s.name && (
                      <span className="text-[10px] text-muted-foreground">{s.description}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Geography</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              type="button"
              disabled={dashboardPresets.lockGeography && dashboardPresets.geographyLevel !== "national"}
              onClick={() => state.setGeographyLevel("national")}
              className={cn(
                "px-2 py-0.5 text-xs font-medium transition-colors",
                state.geographyLevel === "national"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
                dashboardPresets.lockGeography && dashboardPresets.geographyLevel !== "national" && "opacity-50 cursor-not-allowed",
              )}
            >
              National
            </button>
            <button
              type="button"
              disabled={dashboardPresets.lockGeography && dashboardPresets.geographyLevel !== "district"}
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
                dashboardPresets.lockGeography && dashboardPresets.geographyLevel !== "district" && "opacity-50 cursor-not-allowed",
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

        {/* Data view: observed history vs projected trajectory to 2030 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Data</span>
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => state.setTimeMode("historical")}
              aria-pressed={state.timeMode === "historical"}
              title="Show measured emissions recorded so far"
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-xs font-medium transition-colors",
                state.timeMode === "historical"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <Activity className="h-3 w-3" />
              Observed
            </button>
            <button
              type="button"
              onClick={() => state.setTimeMode("projection")}
              aria-pressed={state.timeMode === "projection"}
              title="Show the projected path toward the 2030 pledge"
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-xs font-medium transition-colors border-l border-input",
                state.timeMode === "projection"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <TrendingUp className="h-3 w-3" />
              Projected
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="gap-1 h-7 text-xs font-semibold">
                <Sparkles className="h-3 w-3" />NDC AI
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl h-[85vh] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
                <DialogTitle className="text-sm">NDC AI</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                <DashboardAnalyzePanel
                  selectedSector={state.selectedSector as SectorId}
                  selectedTarget={selectedTarget}
                />
              </div>
            </DialogContent>
          </Dialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"><Download className="h-3 w-3" />Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canExport("excel") && (
                <DropdownMenuItem
                  onClick={() => {
                    exportNdcDashboardExcel(emissions);
                    toast.success(`Excel exported (${exportGeographyLabel})`);
                  }}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
                </DropdownMenuItem>
              )}
              {canExport("pdf") && (
                <DropdownMenuItem
                  onClick={() => {
                    exportNdcDashboardPdf(emissions);
                    toast.success(`PDF exported (${exportGeographyLabel})`);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />Summary PDF
                </DropdownMenuItem>
              )}
              {canExport("csv") && (
                <DropdownMenuItem
                  onClick={() => {
                    exportCrtBtrCsv(emissions);
                    toast.success(`CRT/BTR CSV exported (${exportGeographyLabel})`);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />CRT/BTR CSV
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DataCoveragePanel />

      {dashboardMode === "briefing" && (
        <NdcGapSummary variant="compact" onSelectSector={handleGapSectorSelect} />
      )}

      {/* Three-column layout over a slow-drifting climate gradient — one shared scroll */}
      <div className="flex-1 relative isolate overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 dash-animated-bg" />
        <div aria-hidden className="absolute inset-0 -z-10 dash-grid-pattern" />
        <ScrollArea className="h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border items-start">
        <div
          className="min-w-0 dash-crossfade"
          key={`targets-${state.selectedSector}-${state.geographyLevel}`}
        >
          <NDCTargetsColumn scroll={false} selectedSector={state.selectedSector as SectorId} selectedTargetId={state.selectedTargetId} onSelectTarget={handleSelectTarget} />
        </div>
        <div
          className="min-w-0 dash-crossfade"
          key={`observed-${state.selectedTargetId}-${state.selectedSector}-${state.geographyLevel}-${state.selectedDistrictId}-${state.timeMode}`}
        >
          <ObservedDataColumn scroll={false} selectedTarget={selectedTarget} selectedMitigationOptions={state.selectedMitigationOptions} timeMode={state.timeMode as TimeMode} />
        </div>
        <div
          className="min-w-0 dash-crossfade"
          key={`progress-${state.selectedTargetId}-${state.selectedSector}-${state.geographyLevel}-${state.selectedDistrictId}`}
        >
          <ProgressTowardTargetColumn
            scroll={false}
            selectedTarget={selectedTarget}
            footer={
              <div className={cn(
                "mt-1 pt-3 border-t border-border",
                dashboardPresets.emphasizeMrvPanels && "rounded-md border border-primary/30 ring-1 ring-primary/20 bg-primary/5 p-2",
              )}>
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  <LayoutList className="h-3 w-3" />
                  Data &amp; insights
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {([
                    ["activities", "📋 Activities / Measures"],
                    ["sources", "🏭 Top Emitting Sources"],
                    ["spatial", "🛰️ Spatial Certainty"],
                    ["trackability", "📡 What Climate TRACE Can Track"],
                    ["official", "📜 Official sources"],
                    ...(!readOnly ? [["mitigation", "💡 Mitigation Options"]] : []),
                  ] as [string, string][]).map(([key, label]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left text-xs gap-1.5 h-8 whitespace-normal leading-tight"
                      onClick={() => setActivePanel(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            }
          />

          {/* Detail dialogs opened from the Data & insights menu */}
          <Dialog open={activePanel === "activities"} onOpenChange={(o) => !o && setActivePanel(null)}>
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

          <Dialog open={activePanel === "sources"} onOpenChange={(o) => !o && setActivePanel(null)}>
            <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-4 py-3 border-b border-border">
                <DialogTitle className="text-sm">Top Emitting Sources (Climate TRACE)</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                <TopEmittingSources />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={activePanel === "spatial"} onOpenChange={(o) => !o && setActivePanel(null)}>
            <DialogContent className="max-w-2xl h-[80vh] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-4 py-3 border-b border-border">
                <DialogTitle className="text-sm">Spatial Certainty (Climate TRACE)</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                <SpatialConfidencePanel />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={activePanel === "trackability"} onOpenChange={(o) => !o && setActivePanel(null)}>
            <DialogContent className="max-w-3xl h-[80vh] p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-4 py-3 border-b border-border">
                <DialogTitle className="text-sm">NDC Trackability (Climate TRACE)</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0">
                <DataTrackabilityPanel />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={activePanel === "official"} onOpenChange={(o) => !o && setActivePanel(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-sm">Official sources</DialogTitle>
              </DialogHeader>
              <OfficialSourcesPanel sectorId={state.selectedSector as SectorId} embedded />
            </DialogContent>
          </Dialog>

          {!readOnly && (
            <Dialog open={activePanel === "mitigation"} onOpenChange={(o) => !o && setActivePanel(null)}>
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
          )}
        </div>
        </div>
        </ScrollArea>
      </div>
    </div>
  );
}
