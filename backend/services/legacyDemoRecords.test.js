import { describe, expect, it } from "vitest";
import { observationUuid, targetUuid } from "../../database/id.ts";
import { isLegacyDemoObservation, isLegacyDemoTarget } from "./legacyDemoRecords.js";

const oldObservation = {
  id: observationUuid("PRG-001"), target_id: targetUuid("KPI-IRR-HA"), year: 2026,
  value: 8200, source: "MAAIF district reports via UBOS API.", as_of: "2026-03-31",
  is_estimated: false, is_validated: true, qaqc_status: "ok",
};
const oldTarget = {
  id: targetUuid("climate-afolu"), sector: "afolu", baseline_year: 2015, target_year: 2030,
  metric_type: "emissions_reduction", baseline_value: 245, target_value: 171.5, unit: "MtCO₂e",
};

describe("legacy demo record quarantine", () => {
  it("identifies exact known seed records despite their old verified labels", () => {
    expect(isLegacyDemoObservation(oldObservation)).toBe(true);
    expect(isLegacyDemoTarget(oldTarget)).toBe(true);
  });
  it("preserves corrected seed records and independently submitted matching values", () => {
    expect(isLegacyDemoObservation({ ...oldObservation, value: 8201 })).toBe(false);
    expect(isLegacyDemoObservation({ ...oldObservation, source: "ingest:verified district submission" })).toBe(false);
    expect(isLegacyDemoObservation({ ...oldObservation, id: "user-submitted-record" })).toBe(false);
    expect(isLegacyDemoTarget({ ...oldTarget, baseline_value: 77.6 })).toBe(false);
    expect(isLegacyDemoTarget({ ...oldTarget, id: "user-defined-target" })).toBe(false);
  });
});
