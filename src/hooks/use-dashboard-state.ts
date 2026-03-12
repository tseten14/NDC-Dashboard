import { useState, useCallback, useMemo } from "react";
import {
  type SectorId, type TimeMode, type GeographyLevel,
  type DecisionLogEntry, type MitigationOption,
  getTargetsForSector,
} from "@/data/uganda-ndc-data";

export interface DashboardState {
  selectedSector: SectorId;
  selectedTargetId: string | null;
  geographyLevel: GeographyLevel;
  selectedDistrictId: string | null;
  timeMode: TimeMode;
  selectedMitigationOptions: string[];
  decisionLog: DecisionLogEntry[];
}

export function useDashboardState() {
  const [selectedSector, setSelectedSectorRaw] = useState<SectorId>("economy-wide");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [geographyLevel, setGeographyLevelRaw] = useState<GeographyLevel>("national");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [timeMode, setTimeMode] = useState<TimeMode>("historical");
  const [selectedMitigationOptions, setSelectedMitigationOptions] = useState<string[]>([]);
  const [decisionLog, setDecisionLog] = useState<DecisionLogEntry[]>([]);

  const setSelectedSector = useCallback((sector: SectorId) => {
    setSelectedSectorRaw(sector);
    const targets = getTargetsForSector(sector);
    setSelectedTargetId(targets.length > 0 ? targets[0].id : null);
  }, []);

  const setGeographyLevel = useCallback((level: GeographyLevel) => {
    setGeographyLevelRaw(level);
    if (level === "national") setSelectedDistrictId(null);
  }, []);

  const toggleMitigationOption = useCallback((optionId: string) => {
    setSelectedMitigationOptions(prev =>
      prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
    );
  }, []);

  const addToDecisionLog = useCallback((entry: Omit<DecisionLogEntry, "id" | "date">) => {
    setDecisionLog(prev => [...prev, {
      ...entry,
      id: `dl-${Date.now()}`,
      date: new Date().toISOString(),
    }]);
  }, []);

  const updateDecisionStatus = useCallback((entryId: string, status: DecisionLogEntry["status"]) => {
    setDecisionLog(prev => prev.map(e => e.id === entryId ? { ...e, status } : e));
  }, []);

  return {
    selectedSector, setSelectedSector,
    selectedTargetId, setSelectedTargetId,
    geographyLevel, setGeographyLevel,
    selectedDistrictId, setSelectedDistrictId,
    timeMode, setTimeMode,
    selectedMitigationOptions, toggleMitigationOption,
    decisionLog, addToDecisionLog, updateDecisionStatus,
  };
}
