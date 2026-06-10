import { useState, useCallback } from "react";
import { ControlBar } from "@/components/ControlBar";
import { NDCTargetsColumn } from "@/components/columns/NDCTargets";
import { NDCActivitiesColumn } from "@/components/columns/NDCActivities";
import { ObservedDataColumn } from "@/components/columns/ObservedData";
import { ProgressTowardTargetColumn } from "@/components/columns/ProgressTowardTarget";
import { MitigationOptionsColumn } from "@/components/columns/MitigationOptions";
import { useDashboardState } from "@/hooks/use-dashboard-state";
import { ndcTargets } from "@/data/uganda-ndc-data";
import { toast } from "sonner";

const Index = () => {
  const state = useDashboardState();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const selectedTarget = state.selectedTargetId
    ? ndcTargets.find(t => t.id === state.selectedTargetId) ?? null
    : null;

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    toast.info("Fetching latest data from sector APIs...");
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Dashboard data refreshed successfully");
    }, 1500);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ControlBar
        selectedSector={state.selectedSector}
        onSectorChange={state.setSelectedSector}
        geographyLevel={state.geographyLevel}
        onGeographyChange={state.setGeographyLevel}
        selectedDistrictId={state.selectedDistrictId}
        onDistrictChange={state.setSelectedDistrictId}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* Five-column layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border overflow-hidden" style={{ height: "calc(100vh - 88px)" }}>
        <div className="overflow-hidden">
          <NDCTargetsColumn
            selectedSector={state.selectedSector}
            selectedTargetId={state.selectedTargetId}
            onSelectTarget={state.setSelectedTargetId}
          />
        </div>
        <div className="overflow-hidden">
          <NDCActivitiesColumn
            selectedTargetId={state.selectedTargetId}
            geographyLevel={state.geographyLevel}
            selectedDistrictId={state.selectedDistrictId}
          />
        </div>
        <div className="overflow-hidden">
          <ObservedDataColumn
            selectedTarget={selectedTarget}
            selectedMitigationOptions={state.selectedMitigationOptions}
          />
        </div>
        <div className="overflow-hidden">
          <ProgressTowardTargetColumn selectedTarget={selectedTarget} />
        </div>
        <div className="overflow-hidden">
          <MitigationOptionsColumn
            selectedTarget={selectedTarget}
            selectedSector={state.selectedSector}
            timeMode={state.timeMode}
            selectedMitigationOptions={state.selectedMitigationOptions}
            onToggleMitigationOption={state.toggleMitigationOption}
            decisionLog={state.decisionLog}
            onAddToDecisionLog={state.addToDecisionLog}
            onUpdateDecisionStatus={state.updateDecisionStatus}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;
