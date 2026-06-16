/**
 * Uganda's *current* climate finance portfolio — large active grants, concessional
 * loans, and programmes from the major development funders (World Bank, GCF, AfDB,
 * GEF, and bilateral partners).
 *
 * These are illustrative planning figures compiled from public commitment data for
 * the NDC Data Explorer; amounts and dates are approximate and should be verified
 * against the funder's project portal before use in real proposals.
 */
import type { SectorId } from "@/data/uganda-ndc-data";

export type FinanceInstrument = "Grant" | "Concessional loan" | "Blended" | "Results-based";

export interface ActiveFinance {
  id: string;
  funder: string;
  /** Short funder family for grouping/colour. */
  funderType: "World Bank" | "GCF" | "AfDB" | "GEF" | "Bilateral" | "Other MDB";
  programme: string;
  instrument: FinanceInstrument;
  /** Primary NDC sector this finance supports. */
  sectorId: SectorId;
  sectorLabel: string;
  amountUSD: number;
  /** Approval / commitment period. */
  period: string;
  status: "Active" | "Approved" | "Pipeline";
  focus: string;
  /** Official funder portal where the commitment can be verified. */
  sourceUrl: string;
  sourceLabel: string;
}

/** Active and recently-approved climate finance in Uganda (illustrative). */
export const currentClimateFinance: ActiveFinance[] = [
  {
    id: "wb-uganda-landscape",
    funder: "World Bank (IDA)",
    funderType: "World Bank",
    programme: "Investing in Forests & Protected Areas for Climate-Smart Development",
    instrument: "Concessional loan",
    sectorId: "afolu",
    sectorLabel: "AFOLU",
    amountUSD: 148_000_000,
    period: "2022–2028",
    status: "Active",
    focus: "Forest landscape restoration, protected-area management, REDD+ readiness.",
    sourceUrl: "https://projects.worldbank.org/en/projects-operations/projects-list?countrycode_exact=UG",
    sourceLabel: "World Bank Projects portal",
  },
  {
    id: "gcf-buildresilience",
    funder: "Green Climate Fund",
    funderType: "GCF",
    programme: "Building Resilient Communities, Wetland Ecosystems & Catchments",
    instrument: "Grant",
    sectorId: "afolu",
    sectorLabel: "AFOLU",
    amountUSD: 24_100_000,
    period: "2017–2025",
    status: "Active",
    focus: "Wetland restoration and climate-resilient agriculture in 24 districts.",
    sourceUrl: "https://www.greenclimate.fund/countries/uganda",
    sourceLabel: "Green Climate Fund — Uganda",
  },
  {
    id: "afdb-kapchorwa",
    funder: "African Development Bank",
    funderType: "AfDB",
    programme: "Climate-Smart Agriculture & Rural Energy Access",
    instrument: "Blended",
    sectorId: "energy",
    sectorLabel: "Energy",
    amountUSD: 88_000_000,
    period: "2021–2027",
    status: "Active",
    focus: "Mini-grids, productive-use solar, and irrigation for smallholder value chains.",
    sourceUrl: "https://www.afdb.org/en/countries/east-africa/uganda",
    sourceLabel: "African Development Bank — Uganda",
  },
  {
    id: "wb-energy-access",
    funder: "World Bank (IDA)",
    funderType: "World Bank",
    programme: "Electricity Access Scale-up Project (EASP)",
    instrument: "Concessional loan",
    sectorId: "energy",
    sectorLabel: "Energy",
    amountUSD: 638_000_000,
    period: "2021–2027",
    status: "Active",
    focus: "Grid densification, off-grid solar, and clean cooking connections.",
    sourceUrl: "https://projects.worldbank.org/en/projects-operations/projects-list?countrycode_exact=UG",
    sourceLabel: "World Bank Projects portal",
  },
  {
    id: "gef-sustainable-transport",
    funder: "GEF (via UNDP)",
    funderType: "GEF",
    programme: "Low-carbon Urban Mobility — Greater Kampala",
    instrument: "Grant",
    sectorId: "transport",
    sectorLabel: "Transport",
    amountUSD: 6_300_000,
    period: "2020–2025",
    status: "Active",
    focus: "Bus rapid transit planning, non-motorised transport, e-mobility pilots.",
    sourceUrl: "https://www.thegef.org/projects-operations/country-profiles/uganda",
    sourceLabel: "GEF — Uganda country profile",
  },
  {
    id: "giz-clean-cooking",
    funder: "Germany (GIZ / KfW)",
    funderType: "Bilateral",
    programme: "Promotion of Renewable Energy & Energy Efficiency (PREEEP)",
    instrument: "Grant",
    sectorId: "energy",
    sectorLabel: "Energy",
    amountUSD: 32_000_000,
    period: "2019–2026",
    status: "Active",
    focus: "Improved cookstoves, efficiency standards, and institutional capacity.",
    sourceUrl: "https://www.giz.de/en/worldwide/318.html",
    sourceLabel: "GIZ — Uganda",
  },
  {
    id: "eu-waste",
    funder: "European Union",
    funderType: "Bilateral",
    programme: "Sustainable Cities & Municipal Waste Management",
    instrument: "Grant",
    sectorId: "waste",
    sectorLabel: "Waste",
    amountUSD: 21_500_000,
    period: "2022–2027",
    status: "Approved",
    focus: "Municipal solid-waste systems, landfill gas capture, and composting.",
    sourceUrl: "https://international-partnerships.ec.europa.eu/countries/uganda_en",
    sourceLabel: "EU International Partnerships — Uganda",
  },
  {
    id: "gcf-sap-pipeline",
    funder: "Green Climate Fund (SAP)",
    funderType: "GCF",
    programme: "Distributed Solar for Health & Education Facilities (pipeline)",
    instrument: "Grant",
    sectorId: "energy",
    sectorLabel: "Energy",
    amountUSD: 18_000_000,
    period: "2025–2030",
    status: "Pipeline",
    focus: "Solar PV + storage for public institutions; simplified approval process.",
    sourceUrl: "https://www.greenclimate.fund/countries/uganda",
    sourceLabel: "Green Climate Fund — Uganda",
  },
];

export interface FinanceTotals {
  totalUSD: number;
  activeUSD: number;
  pipelineUSD: number;
  byFunderType: { type: string; amountUSD: number }[];
  bySector: { sectorId: SectorId; label: string; amountUSD: number }[];
  count: number;
}

export function summariseClimateFinance(rows: ActiveFinance[] = currentClimateFinance): FinanceTotals {
  const totalUSD = rows.reduce((s, r) => s + r.amountUSD, 0);
  const activeUSD = rows.filter((r) => r.status !== "Pipeline").reduce((s, r) => s + r.amountUSD, 0);
  const pipelineUSD = rows.filter((r) => r.status === "Pipeline").reduce((s, r) => s + r.amountUSD, 0);

  const funderMap = new Map<string, number>();
  for (const r of rows) funderMap.set(r.funderType, (funderMap.get(r.funderType) ?? 0) + r.amountUSD);
  const byFunderType = [...funderMap.entries()]
    .map(([type, amountUSD]) => ({ type, amountUSD }))
    .sort((a, b) => b.amountUSD - a.amountUSD);

  const sectorMap = new Map<SectorId, { label: string; amountUSD: number }>();
  for (const r of rows) {
    const cur = sectorMap.get(r.sectorId);
    sectorMap.set(r.sectorId, { label: r.sectorLabel, amountUSD: (cur?.amountUSD ?? 0) + r.amountUSD });
  }
  const bySector = [...sectorMap.entries()]
    .map(([sectorId, v]) => ({ sectorId, label: v.label, amountUSD: v.amountUSD }))
    .sort((a, b) => b.amountUSD - a.amountUSD);

  return { totalUSD, activeUSD, pipelineUSD, byFunderType, bySector, count: rows.length };
}

export function financeForSector(sectorId: SectorId | null): ActiveFinance[] {
  if (!sectorId) return currentClimateFinance;
  // agriculture rolls up into AFOLU for finance grouping
  const key = sectorId === "agriculture" ? "afolu" : sectorId;
  return currentClimateFinance.filter((r) => (r.sectorId === "agriculture" ? "afolu" : r.sectorId) === key);
}
