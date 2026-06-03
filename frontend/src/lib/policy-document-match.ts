import type { PolicyDocument } from "./policy-documents";
import type { SectorId } from "@/data/uganda-ndc-data";

const SECTOR_KEYWORDS: Record<SectorId, string[]> = {
  AFOLU: ["forest", "redd", "wetland", "land use", "afolu", "forestry", "deforest"],
  Energy: ["energy", "power", "electrification", "electricity", "solar", "grid", "renewable"],
  Transport: ["transport", "road", "vehicle", "mobility", "rail"],
  IPPU: ["industrial", "manufacturing", "ippu", "cement", "fluorinated"],
  Agriculture: ["agriculture", "agroforestry", "livestock", "crop", "dairy", "csa"],
  Waste: ["waste", "landfill", "sanitation"],
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
