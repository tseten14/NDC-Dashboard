/**
 * The app's shared screen state.
 *
 * Holds the choices that several screens need to agree on: the selected sector
 * and target, whether the view is national or one district, and the running
 * decision log. Keeping these in one place is what lets a sector chosen on one
 * screen still be selected after navigating to another.
 *
 * Two rules are enforced here rather than left to each screen: changing sector
 * clears the chosen target (it belonged to the old sector), and returning to the
 * national view clears the chosen district.
 */
import { useState, useCallback, createContext, useContext } from "react";
import type { StrategyId, ViewMode, ValidationFilter } from "@/data/uganda-strategy-data";
import type { DecisionLogEntry, DecisionStatus } from "@/data/uganda-ndc-data";

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
  decisionLog: DecisionLogEntry[];
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
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);

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

  /** The caller supplies the decision itself; id and timestamp are stamped here. */
  const addToDecisionLog = useCallback((entry: Omit<DecisionLogEntry, "id" | "date">) => {
    setDecisionLog(prev => [...prev, { ...entry, id: `dl-${Date.now()}`, date: new Date().toISOString() }]);
  }, []);

  const updateDecisionStatus = useCallback((entryId: string, status: DecisionStatus) => {
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
