/**
 * Climate-finance economics engine (indicative).
 *
 * Built around ONE honest, easy-to-understand idea:
 *   - Every mitigation project has a "cost to abate" (USD per tonne of CO2e
 *     avoided), levelised over its lifetime.
 *   - Carbon credits pay a price per tonne.
 *   - If the cost to abate is below the carbon price, selling credits more than
 *     covers the cost -> the project is self-funding / attractive.
 *
 * We deliberately do NOT report NPV / IRR / multi-year ROI: the underlying cost
 * figures are rough public estimates, so precise financial returns would imply
 * false accuracy. Everything here is INDICATIVE screening, not investment advice.
 */
import type { MitigationOption } from "@/data/uganda-ndc-data";

export interface FinanceAssumptions {
  /** Carbon credit price, USD per tonne CO2e. */
  carbonPrice: number;
  /** Project economic lifetime, years (used to spread upfront cost). */
  lifetimeYears: number;
  /** Discount rate (fraction, e.g. 0.10 = 10%). */
  discountRate: number;
}

export const DEFAULT_ASSUMPTIONS: FinanceAssumptions = {
  carbonPrice: 20,
  lifetimeYears: 10,
  discountRate: 0.1,
};

export const ASSUMPTION_BOUNDS = {
  carbonPrice: { min: 0, max: 100, step: 1 },
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
  /** Abatement potential, MtCO2e per year. */
  abatementMtPerYr: number;
  /** Abatement potential, tonnes CO2e per year. */
  abatementTPerYr: number;
  costType: "capex" | "annual";
  capexUSD: number;
  annualCostUSD: number;
  /** Total funding need to deploy (upfront capex, or annual cost over the lifetime). */
  fundingNeedUSD: number;
  /** Levelised annual cost (capex spread via CRF + any annual cost). */
  annualizedCostUSD: number;
  /** Cost to abate one tonne of CO2e, USD/t (levelised). The headline metric. */
  costToAbateUSDPerT: number | null;
  /** Screening range when confidence is not high (± fraction of cost to abate). */
  costToAbateLowUSDPerT: number | null;
  costToAbateHighUSDPerT: number | null;
  /** Carbon-credit revenue per year at the chosen price. */
  annualRevenueUSD: number;
  /** Net annual value = revenue - levelised cost = (price - costToAbate) * tonnes. */
  netAnnualUSD: number;
  /** True when the carbon price alone covers the cost to abate. */
  carbonCoversCost: boolean;
}

function isAnnualCost(magnitude: string): boolean {
  return /\/\s*yr|per year|annum|annual/i.test(magnitude);
}

/** Capital recovery factor: spreads an upfront cost into an equivalent annual cost. */
function crf(rate: number, years: number): number {
  if (years <= 0) return 1;
  if (rate <= 0) return 1 / years;
  const f = (1 + rate) ** years;
  return (rate * f) / (f - 1);
}

/** Uncertainty band on levelised cost to abate from NDC data confidence (screening only). */
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

export function computeProjectEconomics(
  option: MitigationOption,
  a: FinanceAssumptions,
): ProjectEconomics {
  const abatementMt = Math.max(0, Number(option.emissionsReductionPotential) || 0);
  const abatementT = abatementMt * 1e6;
  // Cost figures in the catalogue are expressed in USD millions.
  const amountUSD = (Number(option.costEstimate) || 0) * 1e6;
  const annual = isAnnualCost(option.costMagnitude || "");
  const capexUSD = annual ? 0 : amountUSD;
  const annualCostUSD = annual ? amountUSD : 0;

  const annualizedCostUSD = capexUSD * crf(a.discountRate, a.lifetimeYears) + annualCostUSD;
  const costToAbateUSDPerT = abatementT > 0 ? annualizedCostUSD / abatementT : null;

  const annualRevenueUSD = abatementT * a.carbonPrice;
  const netAnnualUSD = annualRevenueUSD - annualizedCostUSD;
  const confidence = normalizeConfidence(option.confidence);
  const band = confidenceBand(costToAbateUSDPerT, confidence);

  return {
    id: option.id,
    title: option.title,
    description: option.description,
    sectorId: String(option.sectorId),
    confidence,
    abatementMtPerYr: abatementMt,
    abatementTPerYr: abatementT,
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
  };
}

export interface MaccEntry extends ProjectEconomics {
  cumulativeAbatementMt: number;
}

/** Marginal-abatement-cost curve: projects cheapest-first with running abatement. */
export function buildMaccCurve(
  options: MitigationOption[],
  a: FinanceAssumptions,
): MaccEntry[] {
  const econ = options
    .map((o) => computeProjectEconomics(o, a))
    .filter((e) => e.abatementMtPerYr > 0)
    .sort((x, y) => (x.costToAbateUSDPerT ?? Infinity) - (y.costToAbateUSDPerT ?? Infinity));
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
  optionsUsed: ProjectEconomics[];
}

/** Greedily stack the cheapest options (by cost to abate) toward the sector's gap. */
export function investmentToCloseGap(
  gapMt: number,
  sectorOptions: MitigationOption[],
  a: FinanceAssumptions,
): GapClosure {
  const sorted = sectorOptions
    .map((o) => computeProjectEconomics(o, a))
    .filter((e) => e.abatementMtPerYr > 0)
    .sort((x, y) => (x.costToAbateUSDPerT ?? Infinity) - (y.costToAbateUSDPerT ?? Infinity));

  const used: ProjectEconomics[] = [];
  let secured = 0;
  let funding = 0;
  let revenue = 0;
  const target = Math.max(0, gapMt);
  for (const e of sorted) {
    if (target > 0 && secured >= target) break;
    used.push(e);
    secured += e.abatementMtPerYr;
    funding += e.fundingNeedUSD;
    revenue += e.annualRevenueUSD;
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

// ── Formatters ──────────────────────────────────────────────────────────────
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
