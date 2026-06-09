import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCurated, getDocumentById, getMeta, listDocuments } from "./policyDocuments.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("policyDocuments", () => {
  it("loads corpus with expected categories and Uganda NDC/BUR", () => {
    const meta = getMeta();
    expect(meta.count).toBeGreaterThanOrEqual(200);
    expect(meta.categories["UN Submissions"]).toBeGreaterThanOrEqual(10);
    expect(meta.categories.MCF).toBeGreaterThanOrEqual(100);

    const ndc = listDocuments({ category: "UN Submissions", q: "Nationally Determined Contribution", limit: 5 });
    expect(ndc.documents.some((d) => /updated 2022/i.test(d.title))).toBe(true);

    const bur = listDocuments({ q: "Second Biennial Update Report", limit: 5 });
    expect(bur.documents.length).toBeGreaterThan(0);
  });

  it("resolves all curated ids from uganda-policy-curated.json", () => {
    const curatedPath = join(__dirname, "..", "data", "uganda-policy-curated.json");
    const curated = JSON.parse(readFileSync(curatedPath, "utf8"));
    const ids = [
      ...(curated.global || []),
      ...Object.values(curated.dashboard || {}).flat(),
      ...Object.values(curated.finance || {}).flat(),
    ];
    const unique = [...new Set(ids)];

    for (const id of unique) {
      expect(getDocumentById(id), `missing curated id ${id}`).not.toBeNull();
    }

    const afolu = getCurated({ sectorId: "AFOLU", context: "dashboard" });
    expect(afolu.documents.length).toBeGreaterThanOrEqual(4);
    expect(afolu.documents.every((d) => d.documentUrl)).toBe(true);

    const finance = getCurated({ sectorId: "Energy", context: "finance" });
    expect(finance.documents.length).toBeGreaterThanOrEqual(1);
  });

  it("includes WASH National Adaptation Plan from June 2026 export", () => {
    const wash = listDocuments({ q: "WASH National Adaptation Plan", limit: 5 });
    expect(wash.documents.some((d) => /2026-2030/i.test(d.title))).toBe(true);
  });
});
