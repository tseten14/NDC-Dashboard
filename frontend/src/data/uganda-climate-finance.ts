/** Selected programme commitments checked against exact funder records.
 * This is a dated, partial reference list, not Uganda's current finance total.
 */
import type { SectorId } from "@/data/uganda-ndc-data";

export interface ActiveFinance {
  id: string;
  funder: string;
  programme: string;
  sectorId: SectorId;
  amountUSD: number;
  amountDescription: string;
  approvedOn: string;
  sourceUrl: string;
  sourceLabel: string;
  checkedOn: string;
}

export const currentClimateFinance: ActiveFinance[] = [
  {
    id: "gcf-fp034",
    funder: "Green Climate Fund",
    programme: "Building Resilient Communities, Wetland Ecosystems and Associated Catchments in Uganda",
    sectorId: "afolu",
    amountUSD: 24_140_160,
    amountDescription: "GCF grant commitment only; excludes co-financing. This is an adaptation project.",
    approvedOn: "2016-12-15",
    sourceUrl: "https://www.greenclimate.fund/portfolio/projects/fp034",
    sourceLabel: "GCF project FP034 — Financing",
    checkedOn: "2026-09-28",
  },
  {
    id: "wb-p166685",
    funder: "World Bank (IDA)",
    programme: "Electricity Access Scale-up Project (EASP)",
    sectorId: "energy",
    amountUSD: 568_000_000,
    amountDescription: "Original IDA credit and grant commitments: USD 331.5 million plus USD 236.5 million. Total project financing, not the amount classified as climate finance or spent.",
    approvedOn: "2022-03-31",
    sourceUrl: "https://financesone.worldbank.org/countries/uganda?skip=20",
    sourceLabel: "World Bank Finances — P166685 (IDA70750 and IDAD9970)",
    checkedOn: "2026-09-28",
  },
];

export function financeForSector(sectorId: string | null | undefined): ActiveFinance[] {
  if (!sectorId) return currentClimateFinance;
  const key = sectorId === "agriculture" ? "afolu" : sectorId;
  return currentClimateFinance.filter((row) => row.sectorId === key);
}
