/**
 * Where each sector's numbers come from.
 *
 * Records, per sector, which Climate TRACE categories were combined to produce
 * the figure shown and how. Screens use this to answer "where did this number
 * come from?" with a specific trail rather than a general reassurance.
 */
// Data lineage metadata for every Climate TRACE sector we track.
// Used by the View Source modal and click-to-trace provenance panel.

import type { ClimatetraceApiSector } from "@/lib/emissions-integration";

export interface SectorLineage {
  sectorSlug: string;
  sectorLabel: string;
  ctPublicUrl: string;
  apiEndpoint: string;
  rawTable: string;
  harmonisedView: string;
  methodology: string;
  dataVersion: string;
  refreshCadence: string;
  pipelineStages: { stage: string; description: string }[];
  primarySources: string[];
  uncertaintyNote: string;
}

const CT_BASE = "https://climatetrace.org";
const CT_INVENTORY_BASE = `${CT_BASE}/inventory?country=UGA`;

/** Public Climate TRACE HTTP API documentation (v7). */
export const CLIMATE_TRACE_API_DOCS_URL = "https://api.climatetrace.org/v7/docs/index.html";

export const SECTOR_LINEAGE: Record<ClimatetraceApiSector | "economy-wide", SectorLineage> = {
  energy: {
    sectorSlug: "energy",
    sectorLabel: "Energy",
    ctPublicUrl: `${CT_INVENTORY_BASE}&sector=energy`,
    apiEndpoint: "GET /api/v1/emissions/timeseries?country=UGA&sector=energy",
    rawTable: "ct_raw_v7.energy_sector_timeseries_uga",
    harmonisedView: "ct_harmonised.energy_by_country_annual",
    methodology: "Bottom-up activity data (IEA/IRENA fuel consumption) combined with satellite-detected thermal anomaly cross-validation",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual (Q1 each year); interim estimates quarterly",
    pipelineStages: [
      { stage: "Ingest", description: "IEA World Energy Balances, IRENA statistics, national energy reports" },
      { stage: "Harmonise", description: "Convert to MtCO₂e using AR5 GWP100 factors; align fiscal/calendar years" },
      { stage: "Validate", description: "Cross-check against EDGAR v8 and national BUR submissions" },
      { stage: "Aggregate", description: "Roll up sub-sectors to sector total; apply country boundary masks" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/timeseries" },
    ],
    primarySources: ["IEA World Energy Balances", "IRENA Statistics", "Uganda BUR 2022", "EDGAR v8"],
    uncertaintyNote: "±8% at sector level (95% CI); higher uncertainty for distributed sources (small-scale biomass combustion)",
  },

  afolu: {
    sectorSlug: "afolu",
    sectorLabel: "AFOLU (Forestry & Land Use)",
    ctPublicUrl: `${CT_INVENTORY_BASE}&sector=forestry-and-land-use`,
    apiEndpoint: "GET /api/v1/emissions/timeseries?country=UGA&sector=afolu",
    rawTable: "ct_raw_v7.afolu_sector_timeseries_uga",
    harmonisedView: "ct_harmonised.afolu_by_country_annual",
    methodology: "Satellite-derived land-cover change (Landsat, Sentinel-2) merged with IPCC Tier-2 emission factors; tree-cover loss from Hansen/UMD dataset",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual; satellite imagery updated monthly but emission factors applied annually",
    pipelineStages: [
      { stage: "Ingest", description: "Landsat 8/9 + Sentinel-2 imagery; Hansen Global Forest Watch annual tree-cover loss" },
      { stage: "Classify", description: "ML land-cover classifier (XGBoost + CNN ensemble) trained on FAO reference data" },
      { stage: "Harmonise", description: "Apply IPCC Tier-2 emission factors; subtract removals (sink term)" },
      { stage: "Validate", description: "Cross-check against PRODES (where available) and national forest inventories" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/timeseries" },
    ],
    primarySources: ["Hansen/UMD Global Forest Watch", "Landsat 8/9 (USGS)", "Sentinel-2 (ESA)", "FAO Global Forest Resources Assessment"],
    uncertaintyNote: "±18% at sector level; dominated by biomass carbon density uncertainty in tropical forests",
  },

  agriculture: {
    sectorSlug: "agriculture",
    sectorLabel: "Agriculture",
    ctPublicUrl: `${CT_INVENTORY_BASE}&sector=agriculture`,
    apiEndpoint: "GET /api/v1/emissions/timeseries?country=UGA&sector=agriculture",
    rawTable: "ct_raw_v7.agriculture_sector_timeseries_uga",
    harmonisedView: "ct_harmonised.agriculture_by_country_annual",
    methodology: "FAOSTAT livestock headcount × IPCC Tier-1 enteric fermentation factors; rice area × CH₄ emission factors; fertiliser N₂O from synthetic application rates",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual (aligned to FAOSTAT release schedule, typically March)",
    pipelineStages: [
      { stage: "Ingest", description: "FAOSTAT livestock/crop statistics; national agricultural census data" },
      { stage: "Harmonise", description: "Apply IPCC Tier-1 emission factors; convert livestock CH₄ to CO₂e (GWP100 AR5)" },
      { stage: "Validate", description: "Benchmark against Uganda MoA production statistics and UBOS surveys" },
      { stage: "Aggregate", description: "Sum enteric fermentation, manure, rice, and N₂O sub-sectors" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/timeseries" },
    ],
    primarySources: ["FAOSTAT", "Uganda Bureau of Statistics (UBOS)", "Uganda Ministry of Agriculture"],
    uncertaintyNote: "±12% at sector level; livestock headcount uncertainty is the primary driver",
  },

  transport: {
    sectorSlug: "transport",
    sectorLabel: "Transport",
    ctPublicUrl: `${CT_INVENTORY_BASE}&sector=transportation`,
    apiEndpoint: "GET /api/v1/emissions/timeseries?country=UGA&sector=transport",
    rawTable: "ct_raw_v7.transport_sector_timeseries_uga",
    harmonisedView: "ct_harmonised.transport_by_country_annual",
    methodology: "Vehicle fleet size × fuel consumption per VKT (ICCT); aviation from ADS-B trajectory data; shipping from AIS vessel tracking",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual for road; near-real-time for aviation and shipping sub-sectors",
    pipelineStages: [
      { stage: "Ingest", description: "ICCT fleet data, ADS-B aviation trajectories, AIS shipping positions, Uganda UNRA road statistics" },
      { stage: "Harmonise", description: "Convert fuel consumption to CO₂e; separate domestic/international aviation & shipping" },
      { stage: "Validate", description: "Cross-check road fuel sales against Uganda Energy Regulatory Authority records" },
      { stage: "Aggregate", description: "Sum road, aviation, rail, and waterway sub-sectors" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/timeseries" },
    ],
    primarySources: ["ICCT (International Council on Clean Transportation)", "OpenSky ADS-B network", "MarineTraffic AIS", "Uganda UNRA"],
    uncertaintyNote: "±10% for road; ±5% for aviation; ±15% for inland waterways",
  },

  waste: {
    sectorSlug: "waste",
    sectorLabel: "Waste",
    ctPublicUrl: `${CT_INVENTORY_BASE}&sector=waste`,
    apiEndpoint: "GET /api/v1/emissions/timeseries?country=UGA&sector=waste",
    rawTable: "ct_raw_v7.waste_sector_timeseries_uga",
    harmonisedView: "ct_harmonised.waste_by_country_annual",
    methodology: "First-order decay (FOD) model for landfill CH₄; IPCC Tier-1 factors for wastewater; satellite-detected landfill thermal anomaly cross-validation",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual",
    pipelineStages: [
      { stage: "Ingest", description: "UBOS waste generation statistics, NEMA landfill registry, UN Habitat urban waste data" },
      { stage: "Model", description: "Apply IPCC FOD model for landfill CH₄; Tier-1 wastewater treatment factors" },
      { stage: "Validate", description: "Compare modelled CH₄ against satellite atmospheric column observations (TROPOMI)" },
      { stage: "Aggregate", description: "Sum solid waste disposal, wastewater, and open burning sub-sectors" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/timeseries" },
    ],
    primarySources: ["UBOS Uganda", "NEMA Uganda", "TROPOMI/Sentinel-5P (ESA)", "UN Habitat"],
    uncertaintyNote: "±20% at sector level; landfill gas capture efficiency is highly uncertain",
  },

  ippu: {
    sectorSlug: "ippu",
    sectorLabel: "Industrial Processes (IPPU)",
    ctPublicUrl: `${CT_INVENTORY_BASE}&sector=manufacturing`,
    apiEndpoint: "GET /api/v1/emissions/timeseries?country=UGA&sector=ippu",
    rawTable: "ct_raw_v7.ippu_sector_timeseries_uga",
    harmonisedView: "ct_harmonised.ippu_by_country_annual",
    methodology: "Production-based emission factors (IPCC Tier-2) applied to industrial output statistics for cement, steel, and chemical sub-sectors",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual",
    pipelineStages: [
      { stage: "Ingest", description: "Uganda Manufacturers Association production data, Uganda Revenue Authority trade statistics" },
      { stage: "Harmonise", description: "Apply IPCC Tier-2 IPPU emission factors; separate process CO₂ from energy combustion" },
      { stage: "Validate", description: "Cross-check against facility-level reporting for major cement plants" },
      { stage: "Aggregate", description: "Sum cement, steel, chemicals, and other process sub-sectors" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/timeseries" },
    ],
    primarySources: ["Uganda Manufacturers Association", "Uganda Revenue Authority", "USGS Mineral Yearbook"],
    uncertaintyNote: "±7% at sector level; cement is the dominant and best-constrained source",
  },

  "economy-wide": {
    sectorSlug: "economy-wide",
    sectorLabel: "Economy-Wide Total",
    ctPublicUrl: CT_INVENTORY_BASE,
    apiEndpoint: "GET /api/v1/emissions/summary?country=UGA",
    rawTable: "ct_harmonised.all_sectors_country_annual",
    harmonisedView: "ct_api.country_summary_view",
    methodology: "Sum of all sector-level estimates after deduplication of shared boundaries (e.g. AFOLU/Agriculture interface). Double-counting check applied via reconciliation layer.",
    dataVersion: "Climate TRACE v7 (2024 release)",
    refreshCadence: "Annual; dashboard cache refreshed daily",
    pipelineStages: [
      { stage: "Ingest", description: "Individual sector pipelines (energy, AFOLU, agriculture, transport, waste, IPPU)" },
      { stage: "Deduplicate", description: "Resolve overlapping activity boundaries between sectors" },
      { stage: "Reconcile", description: "Compare sector sum against EDGAR national total; flag deltas > 5%" },
      { stage: "Aggregate", description: "National total = Σ sectors (gross); Net = gross − AFOLU removals" },
      { stage: "Serve", description: "Cache to API layer; expose at /api/v1/emissions/summary" },
    ],
    primarySources: ["Climate TRACE v7 Sector Estimates", "EDGAR v8 (validation)", "Uganda BUR 2022 (validation)"],
    uncertaintyNote: "±10% for national total (quadrature sum of sector uncertainties); aligns within EDGAR ±2σ range",
  },
};

export function getLineage(sector: ClimatetraceApiSector | "economy-wide" | null): SectorLineage | null {
  if (!sector) return null;
  return SECTOR_LINEAGE[sector] ?? null;
}
