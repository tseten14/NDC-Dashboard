/**
 * Mitigation finance pathways for Uganda — informed by NAPX / NAP Finance Navigator logic:
 * match investment scale & type to fund windows; sequence readiness → concept → full proposal;
 * design for the target window from the start (not retrofit after).
 *
 * Uganda is an LDC with GCF accreditation pathways; this module covers NDC **mitigation**
 * measures. Adaptation windows (LDCF, AF) are noted where co-benefits apply.
 */
import type { ProjectEconomics } from "./climate-finance";

export type FundFit = "high" | "medium" | "low" | "ineligible";

export interface FundingWindow {
  id: string;
  name: string;
  category: "gcf" | "gef" | "carbon" | "mdb" | "bilateral" | "national";
  scaleMinUSD: number;
  scaleMaxUSD: number;
  description: string;
  activityTypes: string;
  proposalPath: string;
  ldcNote?: string;
}

export const UGANDA_FINANCE_CONTEXT = {
  classification: "Least Developed Country (LDC)",
  ndcAnchor: "Uganda Updated NDC (September 2022)",
  gcfNote:
    "GCF NDA no-objection required for GCF proposals. Accredited Entity or Direct Access Entity needed for full projects.",
  sequencingPrinciple:
    "Match measure scale to fund ceiling first, then prepare the fund-specific package (readiness → concept note → full proposal).",
};

/** Mitigation-relevant windows (NAPX fund-matching adapted for NDC delivery). */
export const FUNDING_WINDOWS: FundingWindow[] = [
  {
    id: "gcf-readiness",
    name: "GCF Readiness / Project preparation",
    category: "gcf",
    scaleMinUSD: 0,
    scaleMaxUSD: 3_000_000,
    description: "Capacity, feasibility, MRV design, pipeline development. Up to ~USD 3M per readiness package.",
    activityTypes: "Enabling activities, feasibility, institutional strengthening",
    proposalPath: "NDA → Readiness proposal → GCF Secretariat approval",
    ldcNote: "LDCs prioritised for readiness support.",
  },
  {
    id: "gcf-sap",
    name: "GCF Simplified Approval Process (SAP)",
    category: "gcf",
    scaleMinUSD: 3_000_000,
    scaleMaxUSD: 25_000_000,
    description: "Smaller mitigation/adaptation projects with streamlined review (typically under USD 10–25M).",
    activityTypes: "Demonstration, sub-national programmes, distributed energy/waste",
    proposalPath: "Accredited Entity → Concept → SAP funding proposal + NDA no-objection",
  },
  {
    id: "gcf-full",
    name: "GCF Full project (Mitigation / cross-cutting)",
    category: "gcf",
    scaleMinUSD: 10_000_000,
    scaleMaxUSD: 500_000_000,
    description: "Transformational programmes (transport, energy, AFOLU at scale). Requires accredited entity and strong co-finance.",
    activityTypes: "Large infrastructure, national programmes, grid/transport",
    proposalPath: "Concept Note → FPIC / safeguards → Full proposal → Board approval",
  },
  {
    id: "gef-cc",
    name: "GEF Climate Change focal area",
    category: "gef",
    scaleMinUSD: 2_000_000,
    scaleMaxUSD: 30_000_000,
    description: "National enabling, technology transfer, integrated mitigation through GEF agencies (UNDP, UNEP, etc.).",
    activityTypes: "Policy, MRV, sector plans, blended pilot investments",
    proposalPath: "GEF Operational Focal Point → PIF → CEO endorsement → implementation",
  },
  {
    id: "wb-ida",
    name: "World Bank IDA / development policy",
    category: "mdb",
    scaleMinUSD: 20_000_000,
    scaleMaxUSD: 1_000_000_000,
    description: "Energy, transport, urban, and public-sector programmes with climate co-benefits.",
    activityTypes: "Grid, BRT, municipal waste, forest landscapes",
    proposalPath: "Government request → World Bank country programme → project appraisal",
  },
  {
    id: "afdb",
    name: "African Development Bank climate finance",
    category: "mdb",
    scaleMinUSD: 5_000_000,
    scaleMaxUSD: 200_000_000,
    description: "Regional energy, transport corridors, and green growth facilities.",
    activityTypes: "Energy access, transport, agricultural value chains",
    proposalPath: "Country strategy alignment → project brief → AfDB board",
  },
  {
    id: "carbon-market",
    name: "Carbon markets (Article 6 / voluntary)",
    category: "carbon",
    scaleMinUSD: 0,
    scaleMaxUSD: 50_000_000,
    description: "Results-based revenue where certified reductions can be sold at the assumed carbon price.",
    activityTypes: "Forestry, cookstoves, distributed renewables with MRV",
    proposalPath: "Methodology → validation → issuance → purchase agreement (not a grant window)",
  },
  {
    id: "bilateral-ta",
    name: "Bilateral technical assistance",
    category: "bilateral",
    scaleMinUSD: 0,
    scaleMaxUSD: 5_000_000,
    description: "Fast-start TA, feasibility, and piloting from partner ministries (e.g. Germany, UK, EU).",
    activityTypes: "Studies, pilots, standards, capacity",
    proposalPath: "MoWE / sector ministry ↔ development partner agreement",
  },
  {
    id: "national-budget",
    name: "National budget & domestic finance",
    category: "national",
    scaleMinUSD: 0,
    scaleMaxUSD: 100_000_000,
    description: "Recurrent programmes, subsidies, and budget-code-aligned capital (co-finance for external funds).",
    activityTypes: "Cookstoves, standards, municipal services, forest programmes",
    proposalPath: "NDP / sector plans → MoFPED → parliamentary appropriation",
  },
  {
    id: "ldcf-adaptation",
    name: "GEF LDCF (adaptation co-benefits)",
    category: "gef",
    scaleMinUSD: 2_000_000,
    scaleMaxUSD: 30_000_000,
    description: "LDC-only adaptation fund — use when the measure has strong resilience co-benefits (agriculture, water, cities).",
    activityTypes: "CSA, urban resilience, ecosystem-based adaptation",
    proposalPath: "GEF Focal Point → PIF linked to NAP → CEO endorsement",
    ldcNote: "Uganda eligible (LDC). Not a primary mitigation window.",
  },
];

export interface FundMatch {
  window: FundingWindow;
  fit: FundFit;
  rationale: string;
}

export interface ProjectRecommendation {
  projectId: string;
  primaryWindow: FundMatch | null;
  matches: FundMatch[];
  nextSteps: string[];
  coFinanceNote: string;
  ndcAlignment: string;
  dataCaveat: string;
}

function fitFromScale(usd: number, w: FundingWindow): FundFit {
  if (usd < w.scaleMinUSD * 0.75 && w.scaleMinUSD > 0) return "low";
  if (usd > w.scaleMaxUSD * 1.25) return "low";
  if (usd >= w.scaleMinUSD && usd <= w.scaleMaxUSD) return "high";
  if (usd >= w.scaleMinUSD * 0.75 && usd <= w.scaleMaxUSD * 1.1) return "medium";
  return "low";
}

const SECTOR_MDB: Record<string, string[]> = {
  energy: ["wb-ida", "gcf-full", "gef-cc"],
  transport: ["wb-ida", "gcf-full", "afdb"],
  afolu: ["gcf-full", "carbon-market", "gef-cc"],
  agriculture: ["ldcf-adaptation", "gef-cc", "wb-ida"],
  waste: ["gcf-sap", "wb-ida", "national-budget"],
};

export function matchFundingWindows(econ: ProjectEconomics): FundMatch[] {
  const usd = econ.fundingNeedUSD;
  const sector = econ.sectorId.toLowerCase();
  const preferred = SECTOR_MDB[sector] ?? [];

  const matches: FundMatch[] = FUNDING_WINDOWS.map((window) => {
    let fit = fitFromScale(usd, window);
    let rationale = `Indicative need ${formatScale(usd)} vs window ${formatScale(window.scaleMinUSD)}–${formatScale(window.scaleMaxUSD)}.`;

    if (window.id === "carbon-market") {
      if (econ.carbonCoversCost) {
        fit = "high";
        rationale = "Levelised cost to abate is at or below the carbon price — results-based finance may cover marginal cost.";
      } else if (econ.costToAbateUSDPerT != null && econ.costToAbateUSDPerT < 80) {
        fit = "medium";
        rationale = "Moderate cost to abate — may pair grant/co-finance with partial carbon revenue.";
      } else {
        fit = "low";
        rationale = "Carbon price alone unlikely to cover costs; grants or concessional finance needed first.";
      }
    }

    if (
      window.id === "gcf-readiness" &&
      econ.confidence === "low" &&
      usd <= w.scaleMaxUSD &&
      fit !== "high"
    ) {
      fit = fit === "low" ? "medium" : fit;
      rationale =
        "Low confidence cost data — readiness funds can finance feasibility before a full proposal (if scale fits).";
    } else if (window.id === "gcf-readiness" && usd > 15_000_000 && fit === "low") {
      rationale =
        "Large programme — readiness may help prepare feasibility, but scale likely needs a larger window after preparation.";
    }

    if (preferred.includes(window.id) && fit === "high") {
      rationale += ` Sector (${sector}) commonly financed through this channel in comparable LDC programmes.`;
    } else if (preferred.includes(window.id) && fit === "medium") {
      rationale += ` Sector (${sector}) has used this channel before — verify scale and eligibility.`;
    }

    if (window.id === "national-budget" && usd < 50_000_000 && fit !== "low") {
      rationale += " Many NDC measures expect domestic co-finance or line-ministry delivery.";
    }

    return { window, fit, rationale };
  });

  const order: Record<FundFit, number> = { high: 0, medium: 1, low: 2, ineligible: 3 };
  return matches
    .filter((m) => m.fit !== "ineligible")
    .sort((a, b) => order[a.fit] - order[b.fit]);
}

export function buildProjectRecommendation(
  econ: ProjectEconomics,
  carbonPrice: number,
): ProjectRecommendation {
  const matches = matchFundingWindows(econ);
  const primaryWindow = matches.find((m) => m.fit === "high") ?? matches[0] ?? null;

  const nextSteps: string[] = [];
  if (econ.confidence === "low") {
    nextSteps.push("Commission a feasibility study — NDC cost figures for this measure are low-confidence.");
  }
  if (econ.fundingNeedUSD >= 10_000_000) {
    nextSteps.push("Engage GCF National Designated Authority (NDA) for no-objection pathway and accredited entity.");
  } else if (econ.fundingNeedUSD >= 3_000_000) {
    nextSteps.push("Scope a GCF SAP or GEF PIF — match documentation to fund template from concept stage.");
  } else {
    nextSteps.push("Consider bilateral TA or GCF readiness to mature the concept before a full proposal.");
  }
  if (econ.carbonCoversCost) {
    nextSteps.push(
      `Develop MRV and certification pathway for carbon credits at ≥ $${carbonPrice}/tCO₂e (Article 6 or voluntary, subject to national rules).`,
    );
  } else {
    nextSteps.push("Identify grant or concessional co-finance — carbon revenue alone is unlikely to close the gap at this price.");
  }
  nextSteps.push("Link to Uganda Updated NDC target and sector MRV in the investment note (BTR / transparency).");
  if (primaryWindow) {
    nextSteps.push(`Primary packaging target: ${primaryWindow.window.name} — ${primaryWindow.window.proposalPath}`);
  }

  const coFinanceNote =
    econ.fundingNeedUSD >= 20_000_000
      ? "GCF and MDB windows typically require 20–50% co-finance (public or private). Map MoFPED / sector budgets early."
      : "Smaller measures can blend national budget lines with a single external grant window.";

  return {
    projectId: econ.id,
    primaryWindow,
    matches: matches.slice(0, 6),
    nextSteps: nextSteps.slice(0, 5),
    coFinanceNote,
    ndcAlignment: `Trace to NDC sector "${econ.sectorId}" and Uganda's 2030 mitigation target; do not double-count abatement across measures.`,
    dataCaveat:
      econ.confidence === "high"
        ? "Cost and abatement from NDC text — still indicative, not audited."
        : econ.confidence === "medium"
          ? "Treat cost to abate as a screening range (±~20%), not a bid price."
          : "Low confidence — use for prioritisation only; do not use in financial close.",
  };
}

export function getUgandaSequencingGuidance(): string[] {
  return [
    "Align the measure to NDC target and sector MRV before choosing a fund (NAPX principle: design for the window, not retrofit).",
    "Under USD 3M: GCF Readiness, bilateral TA, or national pilot → feasibility & safeguards.",
    "USD 3–25M: GCF SAP or GEF PIF with GEF Operational Focal Point / NDA coordination.",
    "Above USD 25M: GCF Full Project or World Bank/AfDB programme — plan co-finance and accredited entity early.",
    "Where cost to abate ≤ carbon price: layer results-based finance (credits) on top of any grant, not instead of upfront capex.",
    "Measures with adaptation co-benefits (agriculture, cities): screen LDCF/NAP alignment in parallel — do not merge budgets.",
  ];
}

export interface PortfolioFinanceWarning {
  id: string;
  severity: "info" | "warn";
  message: string;
}

export function assessPortfolioDataQuality(
  gapMt: number,
  options: { abatementMtPerYr: number }[],
): PortfolioFinanceWarning[] {
  const warnings: PortfolioFinanceWarning[] = [];
  const catalogMt = options.reduce((s, o) => s + Math.max(0, o.abatementMtPerYr), 0);

  warnings.push({
    id: "indicative",
    severity: "info",
    message:
      "Abatement potentials and costs are indicative figures from the Uganda Updated NDC mitigation analysis — not measured emissions reductions or tendered costs.",
  });

  if (gapMt > 0 && catalogMt > gapMt * 1.2) {
    warnings.push({
      id: "overlap",
      severity: "warn",
      message: `Catalogue abatement (${catalogMt.toFixed(1)} Mt/yr) exceeds the modelled 2030 gap (${gapMt.toFixed(1)} Mt). Measures overlap — do not sum potentials as if additive.`,
    });
  }

  warnings.push({
    id: "gap-method",
    severity: "info",
    message:
      "2030 gap uses Climate TRACE observed trends vs NDC targets. Sector gap closure stacks cheapest projects greedily — a screening exercise, not a national investment plan.",
  });

  return warnings;
}

function formatScale(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${usd.toFixed(0)}`;
}
