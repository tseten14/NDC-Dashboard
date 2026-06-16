import { describe, it, expect } from "vitest";
import {
  buildTopicLabels,
  cprDocumentUrl,
  flattenTopicIds,
  parseTopicIds,
  parseTopicIdGroups,
  parseTopicLabellers,
  slugFromDocumentUrl,
} from "./policyPassageParser.js";

describe("policyPassageParser", () => {
  it("builds CPR document URL from slug", () => {
    expect(cprDocumentUrl("uganda-ndc_d4ec")).toBe(
      "https://app.climatepolicyradar.org/documents/uganda-ndc_d4ec",
    );
  });

  it("extracts slug from document URL", () => {
    expect(
      slugFromDocumentUrl(
        "https://app.climatepolicyradar.org/documents/fourth-national-development-plan-ndpi-2025-26-2029-30_d631",
      ),
    ).toBe("fourth-national-development-plan-ndpi-2025-26-2029-30_d631");
  });

  it("parses comma-separated topic ids", () => {
    expect(parseTopicIds("Q1829, Q1277")).toEqual(["Q1829", "Q1277"]);
  });

  it("parses semicolon-separated topic groups (legacy helper)", () => {
    const groups = parseTopicIdGroups("Q218; Q557, Q1831");
    expect(groups).toEqual([["Q218"], ["Q557", "Q1831"]]);
    expect(flattenTopicIds(groups)).toEqual(["Q218", "Q557", "Q1831"]);
  });

  it("parses keyword and BERT labellers", () => {
    const labellers = parseTopicLabellers('["KeywordClassifier(\\"greenhouse gas\\")"]');
    expect(labellers[0].type).toBe("keyword");
    expect(labellers[0].concept).toBe("greenhouse gas");

    const bert = parseTopicLabellers(
      '["BertBasedClassifier(\\"finance flow\\")"], ["KeywordClassifier(\\"fees and charges\\")"]',
    );
    expect(bert).toHaveLength(2);
    expect(bert[0].type).toBe("bert");
    expect(bert[1].type).toBe("keyword");
  });

  it("builds topic labels with BERT full-paragraph flag per aligned labeller", () => {
    const ids = parseTopicIds("Q1829, Q1277");
    const labellers = parseTopicLabellers(
      '["BertBasedClassifier(\\"finance flow\\")"], ["KeywordClassifier(\\"fees\\")"]',
    );
    const labels = buildTopicLabels(ids, "Full paragraph text", labellers);
    expect(labels).toHaveLength(2);
    expect(labels[0].isFullParagraph).toBe(true);
    expect(labels[1].isFullParagraph).toBe(false);
  });
});
