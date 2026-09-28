/** Provenance of the transformations this application actually performs. */
import type { ClimatetraceApiSector } from "@/lib/emissions-integration";
import { SECTOR_MAP } from "../../../config/ndcTargets.js";

export interface SectorLineage {
  sectorSlug: string;
  sectorLabel: string;
  ctPublicUrl: string;
  apiEndpoint: string;
  methodology: string;
  dataVersion: string;
  refreshCadence: string;
  pipelineStages: { stage: string; description: string }[];
  primarySources: string[];
  uncertaintyNote: string;
}

export const CLIMATE_TRACE_API_DOCS_URL = "https://api.climatetrace.org/v7/docs/index.html";
const labels = {
  energy: "Energy", afolu: "Forestry and land use", agriculture: "Agriculture",
  transport: "Transport", waste: "Waste", ippu: "Industry",
  "economy-wide": "All-sector total",
};

export const SECTOR_LINEAGE = Object.fromEntries(Object.entries(labels).map(([sector, label]) => {
  const isTotal = sector === "economy-wide";
  const slugs: string[] = isTotal ? [] : SECTOR_MAP[sector as ClimatetraceApiSector];
  return [sector, {
    sectorSlug: sector,
    sectorLabel: label,
    ctPublicUrl: "https://climatetrace.org/inventory",
    apiEndpoint: isTotal ? "GET /api/v1/emissions/dashboard" : `GET /api/v1/emissions/timeseries?sector=${sector}`,
    methodology: isTotal
      ? "Uses the total returned by Climate TRACE for the selected place and year, including sectors outside the six dashboard groups."
      : `Adds the Climate TRACE categories ${slugs.join(", ")} for the selected place and year. Missing categories stay unavailable.`,
    dataVersion: "Public API v7. The API response does not identify its dataset release.",
    refreshCadence: "Successful API responses are cached for up to one hour. Historical estimates can change when Climate TRACE revises its data.",
    pipelineStages: [
      { stage: "Fetch", description: "Request /v7/sources/emissions for the selected year and GADM geography, using co2e_100yr." },
      { stage: "Select", description: isTotal ? "Read the returned all-sector total." : `Select ${slugs.join(", ")} and add their unrounded values.` },
      { stage: "Convert", description: "Divide tonnes by 1,000,000 to display millions of tonnes (Mt). Negative values represent net removals." },
      { stage: "Check", description: "Check the response shape, missing categories and agreement between the API total and its sector sum. These checks do not independently validate the underlying estimates." },
    ],
    primarySources: ["Climate TRACE public API v7"],
    uncertaintyNote: "This API response does not provide a confidence interval. The app does not calculate one for observed emissions. Coverage and methods may differ from the national inventory.",
  }];
})) as Record<ClimatetraceApiSector | "economy-wide", SectorLineage>;

export function getLineage(sector: ClimatetraceApiSector | "economy-wide" | null): SectorLineage | null {
  return sector ? SECTOR_LINEAGE[sector] ?? null : null;
}
