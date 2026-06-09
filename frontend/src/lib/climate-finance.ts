/**
 * Climate-finance economics engine (indicative).
 */
import type { MitigationOption } from "@/data/uganda-ndc-data";

export interface FinanceAssumptions {
  carbonPrice: number;
  lifetimeYears: number;
  discountRate: number;
}

export const DEFAULT_ASSUMPTIONS: FinanceAssumptions = {
  carbonPrice: 20,
  lifetimeYears: 10,
  discountRate: 0.1,
};

export const ASSUMPTION_BOUNDS = {
  carbonPrice: { min: 0, max: 50, step: 1 },
  lifetimeYears: { min: 5, max: 25, step: 1 },
  discountRate: { min: 0, max: 0.2, step: 0.005 },
};

export type DataConfidence = "high" | "medium" | "low";

export interface ProjectEconomics {
  id: string;
  title: string;
  description: string;
  sectorId: string;
  confidence: DataConfidence;
  abatementMtPerYr: number;
  abatementTPerYr: number;
  abatementUnit: string;
  abatementIsAnnual: boolean;
  costType: "capex" | "annual";
  capexUSD: number;
  annualCostUSD: number;
  fundingNeedUSD: number;
  annualizedCostUSD: number;
  costToAbateUSDPerT: number | null;
  costToAbateLowUSDPerT: number | null;
  costToAbateHighUSDPerT: number | null;
  annualRevenueUSD: number;
  netAnnualUSD: number;
  carbonCoversCost: boolean;
  abatementSource: string;
  costSource: string;
}

function isAnnualCost(magnitude: string): boolean {
  return /\/\s*yr|per year|annum|annual/i.test(magnitude);
}

function crf(rate: number, years: number): number {
  if (years <= 0) return 1;
  if (rate <= 0) return 1 / years;
  const f = (1 + rate) ** years;
  return (rate * f) / (f - 1);
}

function confidenceBand(
  costToAbate: number | null,
  confidence: DataConfidence,
): { low: number | null; high: number | null } {
  if (costToAbate == null) return { low: null, high: null };
  const spread = confidence === "high" ? 0.1 : confidence === "medium" ? 0.2 : 0.35;
  return {
    low: costToAbate * (1 - spread),
    high: costToAbate * (1 + spread),
  };
}

function normalizeConfidence(c: string): DataConfidence {
  if (c === "high" || c === "medium" || c === "low") return c;
  return "medium";
}

const DEFAULT_ABATEMENT_SOURCE =
  "Uganda Updated NDC (Sept 2022) mitigation analysis — indicative sector-level estimate";
const DEFAULT_COST_SOURCE =
  "Indicative cost benchmark compiled for Climate Finance screening — not tendered or audited";

export function parseAbatementMtPerYr(option: MitigationOption): {
  mtPerYr: number;
  isAnnual: boolean;
  unit: string;
} {
  const raw = Math.max(0, Number(option.emissionsReductionPotential) || 0);
  const unit = String(option.emissionsReductionUnit || "MtCO₂e/yr").trim();
  const normalized = unit.replace(/\s+/g, "").toLowerCase();

  if (/kt.*\/yr|kt.*peryr|ktco2e\/yr/.test(normalized)) {
    return { mtPerYr: raw / 1000, isAnnual: true, unit };
  }
  if (/tco2e\/yr|t\/yr|tonnes?.*\/yr/.test(normalized) && !normalized.startsWith("mt")) {
    return { mtPerYr: raw / 1e6, isAnnual: true, unit };
  }
  if (/mt.*\/yr|mt.*peryr|mtco2e\/yr/.test(normalized)) {
    return { mtPerYr: raw, isAnnual: true, unit };
  }
  if (/mtco2e|mtco₂e|mt\b/.test(normalized) && !/\/yr|peryr|annual/.test(normalized)) {
    return { mtPerYr: raw / 8, isAnnual: false, unit };
  }

  const hasAnnualMarker = /\/yr|per\s*year|annual/i.test(unit);
  return { mtPerYr: raw, isAnnual: hasAnnualMarker, unit };
}

export function parseCostUSD(option: MitigationOption): {
  amountUSD: number;
  isAnnual: boolean;
} {
  const estimate = Math.max(0, Number(option.costEstimate) || 0);
  const magnitude = String(option.costMagnitude || "million").toLowerCase();

  let multiplier = 1;
  if (/billion|bn/.test(magnitude)) multiplier = 1e9;
  else if (/million|m\b/.test(magnitude)) multiplier = 1e6;
  else if (/thousand|k\b/.test(magnitude)) multiplier = 1e3;

  return {
    amountUSD: estimate * multiplier,
    isAnnual: isAnnualCost(option.costMagnitude || ""),
  };
}

export function maccSortKey(
  e: Pick<ProjectEconomics, "costToAbateUSDPerT" | "costToAbateHighUSDPerT" | "confidence" | "id">,
): number {
  if (e.costToAbateUSDPerT == null) return Infinity;
  if (e.confidence === "high") return e.costToAbateUSDPerT;
  return e.costToAbateHighUSDPerT ?? e.costToAbateUSDPerT;
}

export function computeProjectEconomics(
  option: MitigationOption,
  a: FinanceAssumptions,
): ProjectEconomics {
  const { mtPerYr: abatementMt, isAnnual: abatementIsAnnual, unit: abatementUnit } =
    parseAbatementMtPerYr(option);
  const abatementT = abatementMt * 1e6;
  const { amountUSD, isAnnual: annual } = parseCostUSD(option);
  const capexUSD = annual ? 0 : amountUSD;
  const annualCostUSD = annual ? amountUSD : 0;

  const annualizedCostUSD = capexUSD * crf(a.discountRate, a.lifetimeYears) + annualCostUSD;
  const costToAbateUSDPerT = abatementT > 0 ? annualizedCostUSD / abatementT : null;

  const annualRevenueUSD = abatementT * a.carbonPrice;
  const netAnnualUSD = annualRevenueUSD - annualizedCostUSD;
  const confidence = normalizeConfidence(option.confidence);
  const band = confidenceBand(costToAbateUSDPerT, confidence);
  const prov = option.financeProvenance;

  return {
    id: option.id,
    title: option.title,
    description: option.description,
    sectorId: String(option.sectorId),
    confidence,
    abatementMtPerYr: abatementMt,
    abatementTPerYr: abatementT,
    abatementUnit,
    abatementIsAnnual,
    costType: annual ? "annual" : "capex",
    capexUSD,
    annualCostUSD,
    fundingNeedUSD: annual ? annualCostUSD * a.lifetimeYears : capexUSD,
    annualizedCostUSD,
    costToAbateUSDPerT,
    costToAbateLowUSDPerT: band.low,
    costToAbateHighUSDPerT: band.high,
    annualRevenueUSD,
    netAnnualUSD,
    carbonCoversCost: costToAbateUSDPerT != null && costToAbateUSDPerT <= a.carbonPrice,
    abatementSource: prov?.abatementSource ?? DEFAULT_ABATEMENT_SOURCE,
    costSource: prov?.costSource ?? DEFAULT_COST_SOURCE,
  };
}

export interface MaccEntry extends ProjectEconomics {
  cumulativeAbatementMt: number;
}

export function buildMaccCurve(
  options: MitigationOption[],
  a: FinanceAssumptions,
): MaccEntry[] {
  const econ = options
    .map((o) => computeProjectEconomics(o, a))
    .filter((e) => e.abatementMtPerYr > 0 && e.costToAbateUSDPerT != null)
    .sort((x, y) => {
      const dx = maccSortKey(x);
      const dy = maccSortKey(y);
      if (dx !== dy) return dx - dy;
      return x.id.localeCompare(y.id);
    });
  let cum = 0;
  return econ.map((e) => {
    cum += e.abatementMtPerYr;
    return { ...e, cumulativeAbatementMt: cum };
  });
}

export interface GapClosure {
  gapMt: number;
  abatementSecuredMt: number;
  coveredPct: number;
  shortfallMt: number;
  fundingNeedUSD: number;
  annualRevenueUSD: number;
  optionsUsed: Array<ProjectEconomics & { deploymentFraction: number }>;
}

export function investmentToCloseGap(
  gapMt: number,
  sectorOptions: MitigationOption[],
  a: FinanceAssumptions,
): GapClosure {
  const sorted = sectorOptions
    .map((o) => computeProjectEconomics(o, a))
    .filter((e) => e.abatementMtPerYr > 0 && e.costToAbateUSDPerT != null)
    .sort((x, y) => {
      const dx = maccSortKey(x);
      const dy = maccSortKey(y);
      if (dx !== dy) return dx - dy;
      return x.id.localeCompare(y.id);
    });

  const used: GapClosure["optionsUsed"] = [];
  let secured = 0;
  let funding = 0;
  let revenue = 0;
  const target = Math.max(0, gapMt);

  for (const e of sorted) {
    if (target > 0 && secured >= target) break;

    const remaining = target > 0 ? target - secured : e.abatementMtPerYr;
    const fraction = target > 0 ? Math.min(1, remaining / e.abatementMtPerYr) : 1;

    used.push({ ...e, deploymentFraction: fraction });
    secured += e.abatementMtPerYr * fraction;
    funding += e.fundingNeedUSD * fraction;
    revenue += e.annualRevenueUSD * fraction;
  }

  return {
    gapMt: target,
    abatementSecuredMt: secured,
    coveredPct: target > 0 ? Math.min(100, (secured / target) * 100) : secured > 0 ? 100 : 0,
    shortfallMt: Math.max(0, target - secured),
    fundingNeedUSD: funding,
    annualRevenueUSD: revenue,
    optionsUsed: used,
  };
}

export function formatUSD(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatPerT(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `$${v.toFixed(1)}/t`;
}

export function formatMt(v: number | null | undefined, nd = 2): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(nd)} Mt`;
}

export function formatPct(v: number | null | undefined, nd = 0): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(nd)}%`;
}
