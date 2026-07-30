/**
 * Carries a selection between screens.
 *
 * Builds the links that take a chosen mitigation option through to the policy
 * impact screen, and from there on to climate finance — passing the selection
 * along so the user does not have to make it again on each screen.
 */
import type { MitigationOption, SectorId } from "@/data/uganda-ndc-data";

const SECTOR_LABELS: Record<SectorId, string> = {
  "economy-wide": "Economy-wide",
  afolu: "AFOLU",
  energy: "Energy",
  transport: "Transport",
  waste: "Waste",
  ippu: "IPPU",
  agriculture: "AFOLU",
};

/** Map dashboard mitigation options to policy-impact wizard query params. */
export function policyImpactParamsForMitigationOption(option: MitigationOption): {
  sector: string;
  intervention: string;
  objective: string;
} {
  const text = `${option.title} ${option.description}`.toLowerCase();
  let sector = SECTOR_LABELS[option.sectorId] ?? "AFOLU";
  let intervention = "response_measures";

  if (text.includes("solar") || text.includes("renewable") || text.includes("mini-grid")) {
    sector = "Energy";
    intervention = "renewable_energy_investment";
  } else if (text.includes("grid") || text.includes("generation")) {
    sector = "Energy";
    intervention = "grid_investment";
  } else if (text.includes("carbon") && text.includes("pric")) {
    intervention = "carbon_pricing";
  } else if (text.includes("e-bus") || text.includes("electric vehicle") || text.includes(" e-bus")) {
    sector = "Transport";
    intervention = "ev_transition";
  } else if (text.includes("credit") || text.includes("pes") || text.includes("finance")) {
    sector = "AFOLU";
    intervention = "agricultural_credit";
  } else if (text.includes("forest") || text.includes("reforest") || text.includes("plantation") || text.includes("wetland")) {
    sector = "AFOLU";
    intervention = "reforestation";
  } else if (text.includes("efficiency") || text.includes("cookstove") || text.includes("kiln") || text.includes("fuel switch")) {
    intervention = "efficiency_programme";
  } else if (text.includes("fuel") || text.includes("brt") || text.includes("modal shift")) {
    sector = "Transport";
    intervention = "fuel_tax";
  } else if (sector === "Energy") {
    intervention = "renewable_energy_investment";
  } else if (sector === "Transport") {
    intervention = "ev_transition";
  } else if (sector === "AFOLU") {
    intervention = "reforestation";
  }

  return { sector, intervention, objective: option.title };
}

export function policyImpactHrefForMitigationOption(option: MitigationOption): string {
  const { sector, intervention, objective } = policyImpactParamsForMitigationOption(option);
  const params = new URLSearchParams({ sector, intervention, objective });
  return `/policy-impact?${params.toString()}`;
}

const SECTOR_LABEL_TO_ID: Record<string, SectorId> = {
  "economy-wide": "economy-wide",
  afolu: "afolu",
  AFOLU: "afolu",
  energy: "energy",
  Energy: "energy",
  transport: "transport",
  Transport: "transport",
  waste: "waste",
  Waste: "waste",
  ippu: "ippu",
  IPPU: "ippu",
  agriculture: "agriculture",
  Agriculture: "agriculture",
};

/** Deep link from Policy Impact results to Climate Finance screening. */
export function climateFinanceHrefFromPolicyImpact(params: {
  sector: string;
  projectId?: string;
  mitigationOptionId?: string;
  /** Intervention type/label and objective planned in Policy Impact. */
  intervention?: string;
  objective?: string;
  /** Scale slider value (1 = baseline) used to estimate funding need. */
  scale?: number;
}): string {
  const sp = new URLSearchParams();
  const sectorId = SECTOR_LABEL_TO_ID[params.sector] ?? "afolu";
  sp.set("sector", sectorId);
  const projectId = params.mitigationOptionId ?? params.projectId;
  if (projectId) sp.set("projectId", projectId);
  if (params.intervention) sp.set("intervention", params.intervention);
  if (params.objective) sp.set("objective", params.objective);
  if (params.scale != null) sp.set("scale", String(params.scale));
  sp.set("from", "policy-impact");
  return `/climate-finance?${sp.toString()}`;
}
