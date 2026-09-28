/**
 * Verifies Qlik Export behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { describe, expect, it } from "vitest";
import { formatQlikEmissionsCsv } from "./qlikExport.js";

describe("Qlik emissions CSV", () => {
  it("keeps missing observations blank, negative values signed, and scope notes intact", () => {
    const csv = formatQlikEmissionsCsv({
      geography: "national",
      gadm_id: "UGA",
      gas: "co2e_100yr",
      data_stale: false,
      coverage: { sector_scope_notes: { afolu: 'Forestry, land use, and "removals"' } },
      timeseries: { afolu: [
        { year: 2021, value: null },
        { year: 2022, value: -1.25 },
      ] },
    }, "2026-09-28T00:00:00.000Z");

    expect(csv).toContain("emissions_mtco2e,emissions_unit,gas,inventory_status");
    expect(csv).toContain('"2021","afolu","","MtCO2e","co2e_100yr","missing"');
    expect(csv).toContain('"2022","afolu","-1.25","MtCO2e","co2e_100yr","available"');
    expect(csv).toContain('"Forestry, land use, and ""removals"""');
    expect(csv.trim().split("\r\n")).toHaveLength(3);
  });

  it("rejects a district response", () => {
    expect(() => formatQlikEmissionsCsv({ geography: "district", timeseries: {} }))
      .toThrow("national dashboard response");
  });
});
