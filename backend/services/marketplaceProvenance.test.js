import { describe, expect, it, vi } from "vitest";
import example from "./fixtures/legacyMarketplaceExample.json";
import { isLegacyExampleDeal } from "./marketplaceProvenance.js";

vi.mock("../../database/bootstrap.ts", () => ({ getPersistenceMode: () => ({ mode: "memory" }) }));
vi.mock("../../database/index.ts", () => ({ getDb: vi.fn() }));
import { listDeals, getDeal, validateDealNumbers } from "./marketplaceDeals.js";

describe("marketplace provenance", () => {
  it("reports missing persistence instead of returning demonstration pitches", async () => {
    await expect(listDeals()).rejects.toThrow("submissions are unavailable");
    await expect(getDeal("uga-afolu")).rejects.toThrow("submissions are unavailable");
  });

  it("recognizes unchanged older seed content despite database timestamps and JSON key order", () => {
    const row = { ...Object.fromEntries(Object.entries(example).reverse()), createdAt: new Date(), updatedAt: new Date() };
    expect(isLegacyExampleDeal(row)).toBe(true);
  });

  it("preserves submitted edits and unrelated projects", () => {
    expect(isLegacyExampleDeal({ ...example, askM: 44 })).toBe(false);
    expect(isLegacyExampleDeal({ ...example, id: "user-submitted-project" })).toBe(false);
  });

  it("rejects missing or invalid estimates instead of turning them into zero", () => {
    for (const value of [undefined, null, "", " ", "unknown", -1, Infinity, true]) {
      expect(() => validateDealNumbers({ askM: value, coFinanceM: 0, annualMtCO2e: 0 })).toThrow();
    }
    expect(() => validateDealNumbers({ askM: 0, coFinanceM: 0, annualMtCO2e: 0 })).not.toThrow();
    expect(() => validateDealNumbers({ title: "Changed title" }, true)).not.toThrow();
  });
});
