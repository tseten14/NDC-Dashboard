/**
 * Finds the policy documents relevant to a sector.
 *
 * Connects what is on screen to the written policy behind it, so a user looking
 * at forestry figures is offered the forestry strategy.
 */
import type { PolicyDocument } from "./policy-documents";
import type { SectorId } from "@/data/uganda-ndc-data";

const SECTOR_KEYWORDS: Record<SectorId, string[]> = {
  "economy-wide": ["economy", "national", "gdp", "cross-sector", "overall"],
  afolu: ["forest", "redd", "wetland", "land use", "afolu", "forestry", "deforest"],
  energy: ["energy", "power", "electrification", "electricity", "solar", "grid", "renewable"],
  transport: ["transport", "road", "vehicle", "mobility", "rail"],
  ippu: ["industrial", "manufacturing", "ippu", "cement", "fluorinated"],
  agriculture: ["agriculture", "agroforestry", "livestock", "crop", "dairy", "csa"],
  waste: ["waste", "landfill", "sanitation"],
};

function docSearchText(doc: PolicyDocument): string {
  return [doc.title, doc.familyName, doc.familySummary, doc.documentType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchDocumentsForSector(
  docs: PolicyDocument[],
  sectorId: SectorId,
  limit = 8,
): PolicyDocument[] {
  const keywords = SECTOR_KEYWORDS[sectorId] ?? [];
  if (!keywords.length) return docs.slice(0, limit);

  const scored = docs.map((doc) => {
    const text = docSearchText(doc);
    const score = keywords.reduce((n, kw) => (text.includes(kw) ? n + 1 : n), 0);
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (b.doc.familyDate ?? "").localeCompare(a.doc.familyDate ?? ""))
    .slice(0, limit)
    .map((s) => s.doc);
}
