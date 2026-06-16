import { describe, it, expect } from "vitest";
import {
  getPassageCorpusMeta,
  getPassageDocument,
  getPassageEnrichment,
  listPassages,
  listTopics,
  searchPassages,
} from "./policyPassages.js";

describe("policyPassages", () => {
  it("loads passage corpus meta for five key documents", () => {
    const meta = getPassageCorpusMeta();
    expect(meta.documents).toHaveLength(5);
    expect(meta.passageCount).toBeGreaterThan(2000);
    expect(meta.topicCount).toBeGreaterThan(50);
    expect(meta.data_source).toBe("climate_policy_radar_passage_export");
  });

  it("resolves NDC passage document and enrichment", () => {
    const ndc = getPassageDocument("UNFCCC.party.1504.0");
    expect(ndc).not.toBeNull();
    expect(ndc.title).toMatch(/Nationally Determined Contribution/i);
    expect(ndc.catalogId).toBe("e3642b688afc72ce");

    const enrichment = getPassageEnrichment("e3642b688afc72ce");
    expect(enrichment?.hasPassages).toBe(true);
    expect(enrichment?.passageCount).toBeGreaterThan(200);
  });

  it("paginates and filters passages by topic", () => {
    const page1 = listPassages("UNFCCC.party.1504.0", { limit: 10, offset: 0 });
    expect(page1.passages).toHaveLength(10);
    expect(page1.total).toBeGreaterThan(page1.passages.length);

    const topics = listTopics({ documentId: "UNFCCC.party.1504.0" });
    expect(topics.topics.length).toBeGreaterThan(0);

    const topId = topics.topics[0].id;
    const filtered = listPassages("UNFCCC.party.1504.0", { topicId: topId, limit: 50 });
    expect(filtered.passages.every((p) => p.topicIds.includes(topId))).toBe(true);
  });

  it("searches passages across corpus", () => {
    const results = searchPassages({ q: "greenhouse gas", limit: 5 });
    expect(results.passages.length).toBeGreaterThan(0);
    expect(results.passages.length).toBeLessThanOrEqual(5);
    expect(
      results.passages.some(
        (p) =>
          p.text.toLowerCase().includes("greenhouse") ||
          p.topicLabels.some((t) => t.matchedText?.toLowerCase().includes("greenhouse")),
      ),
    ).toBe(true);
  });
});
