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
  classification: "Least developed country",
  ndcAnchor: "Uganda's 2022 climate pledge (NDC)",
  gcfNote:
    "Major international climate funds need government sign-off and an accredited partner to submit a full proposal.",
  sequencingPrinciple:
    "Choose a funding channel that fits the project size, then prepare documents for that funder from the start.",
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
    let rationale = `Project need (~${formatScale(usd)}) fits this fund's typical range (${formatScale(window.scaleMinUSD)}–${formatScale(window.scaleMaxUSD)}).`;

    if (window.id === "carbon-market") {
      if (econ.carbonCoversCost) {
        fit = "high";
        rationale = "Selling carbon credits at your price could cover the cost of cutting emissions.";
      } else if (econ.costToAbateUSDPerT != null && econ.costToAbateUSDPerT < 80) {
        fit = "medium";
        rationale = "Credits may cover part of the cost — grants or cheaper loans would likely be needed too.";
      } else {
        fit = "low";
        rationale = "Credit income alone is unlikely to cover costs — look for grants or concessional finance first.";
      }
    }

    if (
      window.id === "gcf-readiness" &&
      econ.confidence === "low" &&
      usd <= window.scaleMaxUSD &&
      fit !== "high"
    ) {
      fit = fit === "low" ? "medium" : fit;
      rationale =
        "Cost figures are uncertain — preparation grants can fund a feasibility study before a full application.";
    } else if (window.id === "gcf-readiness" && usd > 15_000_000 && fit === "low") {
      rationale =
        "Large programme — preparation funding can help with design, but a bigger fund will be needed later.";
    }

    if (preferred.includes(window.id) && fit === "high") {
      rationale += ` Similar ${sector} projects have used this channel before.`;
    } else if (preferred.includes(window.id) && fit === "medium") {
      rationale += ` This sector has used this channel before — check size and eligibility.`;
    }

    if (window.id === "national-budget" && usd < 50_000_000 && fit !== "low") {
      rationale += " Many climate measures also rely on government budget or ministry delivery.";
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
    nextSteps.push("Commission a feasibility study — cost figures for this project are rough estimates only.");
  }
  if (econ.fundingNeedUSD >= 10_000_000) {
    nextSteps.push("Contact Uganda's climate fund focal point for government approval and an accredited delivery partner.");
  } else if (econ.fundingNeedUSD >= 3_000_000) {
    nextSteps.push("Draft a concept note for a mid-size climate fund (e.g. GCF simplified process or GEF).");
  } else {
    nextSteps.push("Start with a small preparation grant or bilateral technical assistance to develop the idea.");
  }
  if (econ.carbonCoversCost) {
    nextSteps.push(
      `Set up monitoring and certification so carbon credits can be sold at about $${carbonPrice} per tonne.`,
    );
  } else {
    nextSteps.push("Look for grants or low-cost loans — credit sales alone may not cover the full cost at this price.");
  }
  nextSteps.push("Show clearly how the project supports Uganda's official 2030 climate goals.");
  if (primaryWindow) {
    nextSteps.push(`Best-fit funding channel: ${primaryWindow.window.name}.`);
  }

  const coFinanceNote =
    econ.fundingNeedUSD >= 20_000_000
      ? "Large programmes usually need 20–50% matching funds from government or private partners — plan this early."
      : "Smaller projects can combine a government budget line with one external grant.";

  return {
    projectId: econ.id,
    primaryWindow,
    matches: matches.slice(0, 6),
    nextSteps: nextSteps.slice(0, 5),
    coFinanceNote,
    ndcAlignment: `Trace to NDC sector "${econ.sectorId}" and Uganda's 2030 mitigation target; do not double-count abatement across measures.`,
    dataCaveat:
      econ.confidence === "high"
        ? "Costs and emissions cuts come from Uganda's NDC plans — rough estimates, not audited figures."
        : econ.confidence === "medium"
          ? "Treat the cost per tonne as a ballpark range (about ±20%), not a final bid price."
          : "Low confidence — use only to compare projects, not for final investment decisions.",
  };
}

export function getUgandaSequencingGuidance(): string[] {
  return [
    "Link the project to Uganda's official climate goals before choosing where to apply.",
    "Under ~$3M: start with preparation grants, bilateral help, or a government pilot to test the idea.",
    "$3–25M: apply through mid-size climate funds (e.g. GCF simplified process or GEF).",
    "Above ~$25M: plan early for World Bank or African Development Bank programmes and matching government funds.",
    "If credits cover the cost: treat carbon sales as extra income — you may still need upfront grant funding.",
    "Projects that help farmers or cities adapt may also qualify for separate adaptation funds.",
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
      "Emissions cuts and costs shown here come from Uganda's climate plans — they are planning estimates, not measured results or final tender prices.",
  });

  if (gapMt > 0 && catalogMt > gapMt * 1.2) {
    warnings.push({
      id: "overlap",
      severity: "warn",
      message: `Listed projects could cut more emissions (${catalogMt.toFixed(1)} Mt/yr) than the gap still to close (${gapMt.toFixed(1)} Mt) — many measures overlap, so don't add them all up.`,
    });
  }

  warnings.push({
    id: "gap-method",
    severity: "info",
    message:
      "The 2030 gap compares live satellite trends to Uganda's official goals. We stack the cheapest projects first — a quick screening tool, not a national investment plan.",
  });

  return warnings;
}

function formatScale(usd: number): string {
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(0)}M`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}k`;
  return `$${usd.toFixed(0)}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Intervention-driven screening (connects the Policy Impact feature to funders)
// ───────────────────────────────────────────────────────────────────────────

export interface FinanceChallenge {
  id: string;
  severity: "warn" | "info";
  title: string;
  detail: string;
}

/** Rough order-of-magnitude funding need by sector, scaled by the Policy Impact scale slider (1 = baseline). */
export function estimateInterventionNeedUSD(sectorId: string, scale = 1): number {
  const base: Record<string, number> = {
    energy: 60_000_000,
    transport: 80_000_000,
    afolu: 40_000_000,
    agriculture: 25_000_000,
    waste: 18_000_000,
    ippu: 30_000_000,
    "economy-wide": 50_000_000,
  };
  const b = base[sectorId.toLowerCase()] ?? 35_000_000;
  return Math.round(b * Math.max(0.25, scale));
}

/**
 * Screen the major fund windows for a planned policy intervention and flag the
 * practical challenges Uganda is likely to hit (LDC accreditation, co-finance,
 * MRV, government sign-off). Works from sector + estimated need rather than full
 * project economics, so it can be driven directly from Policy Impact.
 */
export function screenFundsForIntervention(input: {
  sectorId: string;
  estimatedNeedUSD: number;
  interventionLabel?: string;
}): { matches: FundMatch[]; challenges: FinanceChallenge[] } {
  const usd = input.estimatedNeedUSD;
  const sector = input.sectorId.toLowerCase();
  const preferred = SECTOR_MDB[sector] ?? [];

  const matches: FundMatch[] = FUNDING_WINDOWS.filter((w) => w.category !== "carbon")
    .map((window) => {
      const fit = fitFromScale(usd, window);
      let rationale = `Estimated need (~${formatScale(usd)}) sits within this window's typical range (${formatScale(window.scaleMinUSD)}–${formatScale(window.scaleMaxUSD)}).`;
      if (preferred.includes(window.id)) {
        rationale += ` Similar ${sector} programmes in Uganda have used this channel.`;
      }
      return { window, fit, rationale };
    });

  const order: Record<FundFit, number> = { high: 0, medium: 1, low: 2, ineligible: 3 };
  const ranked = matches
    .filter((m) => m.fit !== "ineligible")
    .sort((a, b) => {
      const pa = preferred.includes(a.window.id) ? 0 : 1;
      const pb = preferred.includes(b.window.id) ? 0 : 1;
      return order[a.fit] - order[b.fit] || pa - pb;
    });

  const challenges: FinanceChallenge[] = [];

  // Accreditation / government sign-off (always relevant for the big funds)
  if (ranked.some((m) => m.window.category === "gcf" || m.window.category === "mdb")) {
    challenges.push({
      id: "accreditation",
      severity: "warn",
      title: "Accredited entity & government no-objection required",
      detail:
        "GCF and MDB windows cannot be accessed directly — you need an accredited delivery partner and a no-objection letter from Uganda's National Designated Authority (Ministry of Water & Environment).",
    });
  }

  // Co-finance for large asks
  if (usd >= 20_000_000) {
    challenges.push({
      id: "cofinance",
      severity: "warn",
      title: "Co-finance expected (20–50%)",
      detail:
        "At this scale most funders expect matching finance from the national budget or private partners. Identify and commit co-finance sources before the concept note stage.",
    });
  }

  // MRV / monitoring
  challenges.push({
    id: "mrv",
    severity: "info",
    title: "Measurable results & MRV plan",
    detail:
      "Funders need a credible monitoring plan with a baseline, indicators, and a way to report avoided emissions. Reuse the dashboard's Climate TRACE baseline where possible.",
  });

  // LDC opportunity / readiness
  challenges.push({
    id: "ldc-readiness",
    severity: "info",
    title: "Use LDC readiness support first",
    detail:
      "As an LDC, Uganda is prioritised for GCF readiness and project-preparation grants — these can fund the feasibility study and proposal development before a full application.",
  });

  // Small-scale note
  if (usd < 3_000_000) {
    challenges.push({
      id: "small-scale",
      severity: "info",
      title: "Below most fund minimums",
      detail:
        "This is small for the international funds. Start with bilateral technical assistance, a readiness grant, or a national budget line, and bundle with similar projects to reach a fundable size.",
    });
  }

  return { matches: ranked.slice(0, 6), challenges };
}
