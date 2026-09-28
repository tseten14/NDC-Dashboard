/**
 * Verifies Verified Data Boundaries behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDataCompleteness,
  getLastRefreshTimestamp,
  getObservedDataForTarget,
  ndcTargets,
  observedDataSets,
} from "../data/uganda-ndc-data";
import { seedActivities } from "../data/seed-activities";
import { indicatorRegistry } from "../data/indicator-registry";
import {
  buildIndicatorPanelObservedDataSet,
  buildIngestedObservedDataSet,
  type IndicatorPanelEntry,
} from "../lib/emissions-integration";
import { getIndicatorPanel } from "../../../backend/services/indicatorCatalogData.js";
import { getAllPolicyCases, getPolicyCaseById } from "../../../backend/services/policyCaseData.js";
import { runSeed } from "../../../database/seed";
import { climateSectorsForSeed, strategyProgressRecords } from "../../../data/seeds/persistenceSeedSource.js";
import { NDC_TARGETS } from "../../../config/ndcTargets.js";
import { reviewDashboardQaqc } from "../../../shared/qaqcReview.js";

describe("verified data boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("never supplies fabricated annual observations or activity records", () => {
    expect(observedDataSets).toEqual([]);
    expect(seedActivities).toEqual([]);
    expect(climateSectorsForSeed()).toEqual([]);
    expect(strategyProgressRecords).toEqual([]);
    for (const target of ndcTargets) expect(getObservedDataForTarget(target.id)).toBeUndefined();
    expect(getDataCompleteness()).toBe(0);
    expect(getLastRefreshTimestamp()).toBeNull();
  });

  it("retains policy goals but does not fabricate indicator observations or provider connections", async () => {
    const panel = await getIndicatorPanel(2015, 2030);
    expect(panel.t3.meta.targetValue).toBe(4200);
    for (const entry of Object.values(panel) as IndicatorPanelEntry[]) {
      expect(entry.timeseries).toEqual([]);
      expect(entry.meta.isValidated).toBe(false);
      expect(entry.meta.qaqcStatus).toBe("missing");
      expect(entry.meta.dataProviders).toEqual([]);
      expect(entry.meta.lastUpdated).toBe("");
    }
  });

  it("does not turn an unreviewed source into verified data because its numbers look plausible", async () => {
    const panel = await getIndicatorPanel();
    const target = ndcTargets.find((row) => row.id === "t2")!;
    const entry = { ...panel.t2, timeseries: [{ year: 2023, value: 14 }, { year: 2024, value: 15 }] } as IndicatorPanelEntry;
    expect(buildIndicatorPanelObservedDataSet(target, entry).provenance.isValidated).toBe(false);
    const imported = buildIngestedObservedDataSet(target, [{ year: 2024, value: 15, source: "ingest:annual report", as_of: "2025-01-01", is_validated: false }]);
    expect(imported?.historicalData[0].value).toBe(15);
    expect(imported?.provenance.isValidated).toBe(false);
  });

  it("does not mark policy reference metadata as verified annual monitoring", () => {
    expect(indicatorRegistry.every((row) => row.validation_status !== "Verified")).toBe(true);
    expect(indicatorRegistry.every((row) => row.last_update_date === null)).toBe(true);
  });

  it("excludes undocumented quantitative policy examples from the production library", () => {
    expect(getAllPolicyCases()).toEqual([]);
    expect(getPolicyCaseById("kci-brazil-ag-credit")).toBeNull();
  });

  it("cannot load development seeds in production even with the former override", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_PRODUCTION_SEED", "true");
    await expect(runSeed()).rejects.toThrow("cannot be loaded into production");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    await expect(runSeed()).rejects.toThrow("cannot be loaded into production");
  });

  it("has no invented standalone agriculture emissions pledge", () => {
    expect(NDC_TARGETS.agriculture.baseline).toBeNull();
    expect(NDC_TARGETS.agriculture.target).toBeNull();
    expect(NDC_TARGETS.agriculture.progress_comparable).toBe(false);
  });

  it("rejects non-finite values during numerical quality checks", () => {
    expect(reviewDashboardQaqc([{ year: 2023, value: 14 }, { year: 2024, value: Infinity }], "%").isValidated).toBe(false);
  });
});
