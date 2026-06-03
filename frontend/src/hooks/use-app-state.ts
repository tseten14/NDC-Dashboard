import { useState, useCallback, createContext, useContext } from "react";
import type { StrategyId, ViewMode, ValidationFilter } from "@/data/uganda-strategy-data";

export interface AppState {
  activeStrategy: StrategyId | "all";
  viewMode: ViewMode;
  validationFilter: ValidationFilter;
  districtFilter: string | null;
  // NDC layer state (preserved)
  selectedSector: string;
  selectedTargetId: string | null;
  geographyLevel: "national" | "district";
  selectedDistrictId: string | null;
  timeMode: "historical" | "projection";
  selectedMitigationOptions: string[];
  decisionLog: any[];
}

export function useAppState() {
  const [activeStrategy, setActiveStrategy] = useState<StrategyId | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("policy");
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>("all");
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);

  // NDC layer state
  const [selectedSector, setSelectedSectorRaw] = useState("economy-wide");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [geographyLevel, setGeographyLevelRaw] = useState<"national" | "district">("national");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [timeMode, setTimeMode] = useState<"historical" | "projection">("historical");
  const [selectedMitigationOptions, setSelectedMitigationOptions] = useState<string[]>([]);
  const [decisionLog, setDecisionLog] = useState<any[]>([]);

  /** Changing sector clears the selected target unless `preserveTarget` is set (e.g. URL deep-link). */
  const setSelectedSector = useCallback((sector: string, opts?: { preserveTarget?: boolean }) => {
    setSelectedSectorRaw(sector);
    if (!opts?.preserveTarget) setSelectedTargetId(null);
  }, []);

  const setGeographyLevel = useCallback((level: "national" | "district") => {
    setGeographyLevelRaw(level);
    if (level === "national") setSelectedDistrictId(null);
  }, []);

  const toggleMitigationOption = useCallback((optionId: string) => {
    setSelectedMitigationOptions(prev =>
      prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
    );
  }, []);

  const addToDecisionLog = useCallback((entry: any) => {
    setDecisionLog(prev => [...prev, { ...entry, id: `dl-${Date.now()}`, date: new Date().toISOString() }]);
  }, []);

  const updateDecisionStatus = useCallback((entryId: string, status: string) => {
    setDecisionLog(prev => prev.map(e => e.id === entryId ? { ...e, status } : e));
  }, []);

  return {
    activeStrategy, setActiveStrategy,
    viewMode, setViewMode,
    validationFilter, setValidationFilter,
    districtFilter, setDistrictFilter,
    selectedSector, setSelectedSector,
    selectedTargetId, setSelectedTargetId,
    geographyLevel, setGeographyLevel,
    selectedDistrictId, setSelectedDistrictId,
    timeMode, setTimeMode,
    selectedMitigationOptions, toggleMitigationOption,
    decisionLog, addToDecisionLog, updateDecisionStatus,
  };
}

type AppStateReturn = ReturnType<typeof useAppState>;
export const AppStateContext = createContext<AppStateReturn | null>(null);

export function useAppContext() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppContext must be inside AppStateContext.Provider");
  return ctx;
}
