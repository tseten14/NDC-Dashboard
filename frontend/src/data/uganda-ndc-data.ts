import {
  Trees, Flame, Droplets, Factory, Trash2, Bus, CloudRain, Wheat,
  type LucideIcon,
} from "lucide-react";
import { calculateProgress as calculateProgressUnified } from "@/lib/progress";

/* ── Enums & types ── */

export type SectorId =
  | "economy-wide" | "afolu" | "energy" | "transport"
  | "waste" | "ippu" | "agriculture";

export type Conditionality = "Unconditional" | "Conditional" | "Mixed";
export type MetricType = "emissions-reduction" | "forest-cover" | "renewable-energy"
  | "waste-diversion" | "energy-efficiency" | "transport-modal-shift" | "climate-resilience"
  | "activity-share" | "electricity-access" | "wetlands-coverage" | "electricity-capacity";
export type TimeMode = "historical" | "projection";
export type GeographyLevel = "national" | "district";
export type ImplementationLevel = "national" | "district" | "both";
export type QAQCStatus = "ok" | "warning" | "missing" | "inconsistent";
export type DataSourceType = "observed-eo" | "observed-emissions-tracing" | "reported" | "validated";
export type ProgressStatus = "on-track" | "at-risk" | "off-track" | "unknown";
export type ConfidenceLevel = "low" | "medium" | "high";
export type DecisionStatus = "shortlisted" | "approved" | "rejected";

/* ── Interfaces ── */

export interface NDCTarget {
  id: string;
  sectorId: SectorId;
  targetText: string; // verbatim NDC text
  targetYear: number;
  baselineYear: number;
  baselineValue: number;
  targetValue: number;
  unit: string;
  conditionality: Conditionality;
  metricType: MetricType;
}

export interface NDCActivity {
  id: string;
  targetId: string;
  name: string;
  description: string;
  responsibleMinistry: string;
  responsibleDepartment?: string;
  implementationLevel: ImplementationLevel;
  /** Only populated where the NDC explicitly names locations (e.g. Green Cities, GKMA BRT). */
  districts?: string[];
  subActivities?: NDCActivity[];
}

export interface DataProvenance {
  sourceType: DataSourceType;
  mrvOwnerMinistry: string;
  qaqcStatus: QAQCStatus;
  lastUpdated: string; // ISO timestamp
  isValidated: boolean;
}

export interface ObservedDataPoint {
  year: number;
  /** null = no observation for that year (chart gap; not interpolated). */
  value: number | null;
  target?: number;
}

export interface ObservedDataSet {
  targetId: string;
  dataProviders: string[];
  historicalData: ObservedDataPoint[];
  projectionBaseline: ObservedDataPoint[];
  provenance: DataProvenance;
}

export interface MitigationOption {
  id: string;
  targetId: string;
  sectorId: SectorId;
  title: string;
  description: string;
  /** Indicative abatement estimate from NDC mitigation analysis (sector-level, not measured). */
  emissionsReductionPotential: number;
  emissionsReductionUnit: string;
  /** Indicative cost inputs — used only by the Climate Finance screening tool, not shown as data. */
  costEstimate: number;
  costCurrency: string;
  costMagnitude: string;
  confidence: ConfidenceLevel;
}

export interface DecisionLogEntry {
  id: string;
  optionId: string;
  optionTitle: string;
  status: DecisionStatus;
  rationale: string;
  date: string;
}

export interface SectorInfo {
  id: SectorId;
  name: string;
  icon: LucideIcon;
  description: string;
}

/* ── Sector definitions ── */

export const sectorDefinitions: SectorInfo[] = [
  { id: "economy-wide", name: "Economy-wide", icon: CloudRain, description: "All sectors combined — 24.7% below BAU by 2030" },
  { id: "afolu", name: "AFOLU", icon: Trees, description: "Agriculture, Forestry & Other Land Use" },
  { id: "energy", name: "Energy", icon: Flame, description: "Energy Production (Stationary, excl. Transport)" },
  { id: "transport", name: "Transport", icon: Bus, description: "Road, Rail, and Other Transport Modes" },
  { id: "waste", name: "Waste", icon: Trash2, description: "Solid Waste & Wastewater Management" },
  { id: "ippu", name: "IPPU", icon: Factory, description: "Industrial Processes & Product Use" },
  { id: "agriculture", name: "Agriculture", icon: Wheat, description: "Agricultural Production (part of AFOLU NDC target)" },
];

/* ── NDC Targets — Uganda Updated NDC, September 2022 ── */

export const ndcTargets: NDCTarget[] = [
  // ── Economy-wide ──────────────────────────────────────────────────────────
  {
    id: "t0",
    sectorId: "economy-wide",
    targetText: "Reduce economy-wide GHG emissions by 24.7% below Business-As-Usual (BAU) by 2030 (full conditional target: 112.1 MtCO₂e). Unconditional contribution: 5.9% below BAU → 140.1 MtCO₂e, funded by domestic resources. Conditional contribution: additional 18.8% reduction subject to international finance, capacity-building and technology transfer. BAU 2030 reference: 148.8 MtCO₂e. Base year: 2015 (90.1 MtCO₂e).",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 90.1,
    targetValue: 112.1, // full conditional (still growing vs 2015, but 24.7% below 2030 BAU)
    unit: "MtCO₂e",
    conditionality: "Mixed",
    metricType: "emissions-reduction",
  },

  // ── AFOLU ─────────────────────────────────────────────────────────────────
  {
    id: "t1",
    sectorId: "afolu",
    targetText: "Reduce AFOLU sector GHG emissions by 24.9% below BAU levels to 91.8 MtCO₂e by 2030 (BAU 2030: 122.2 MtCO₂e; absolute reduction from BAU: 30.4 MtCO₂e). Measures: REDD+, sustainable land use & agroforestry, commercial plantations, energy-efficient stoves, livestock management, wetlands & peatland restoration. AFOLU contributes 82.7% of Uganda's total mitigation effort.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 77.6,  // 2015 AFOLU national inventory estimate (forestry+land+agriculture+wetlands)
    targetValue: 91.8,    // NDC 2030 conditional target
    unit: "MtCO₂e",
    conditionality: "Mixed",
    metricType: "emissions-reduction",
  },
  {
    id: "t2",
    sectorId: "afolu",
    targetText: "Increase national forest cover from 12.5% in 2020 to 15% by 2025 and 21% of total land area by 2030 through afforestation, reforestation, REDD+, and landscape restoration (Bonn Challenge: 2.5 million ha landscape restored by 2030).",
    targetYear: 2030,
    baselineYear: 2020,
    baselineValue: 12.5,
    targetValue: 21,
    unit: "% land area",
    conditionality: "Conditional",
    metricType: "forest-cover",
  },
  {
    id: "t9",
    sectorId: "afolu",
    targetText: "Increase wetlands coverage from 8.9% in 2020 to 9.57% by 2025 and 12% of land area by 2030 through demarcation, gazettement, and restoration of degraded wetlands. Mitigation co-benefit: 0.4 MtCO₂e reduction by 2030.",
    targetYear: 2030,
    baselineYear: 2020,
    baselineValue: 8.9,
    targetValue: 12,
    unit: "% land area",
    conditionality: "Conditional",
    metricType: "wetlands-coverage",
  },

  // ── Energy (stationary, excl. transport) ──────────────────────────────────
  {
    id: "t4",
    sectorId: "energy",
    targetText: "Limit energy sector (stationary) GHG emissions to 10.10 MtCO₂e by 2030 — a 18.8% reduction below BAU of 12.44 MtCO₂e (-2.34 MtCO₂e). Measures: renewable energy generation (756.8 MW hydro + solar + wind), improved charcoal kiln efficiency (12%→75%), industrial energy efficiency and fuel switching, improved cookstoves (65,000/yr), increased electricity access (100% by 2030), 75% reduction in lighting energy use.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 5.66,
    targetValue: 10.10,
    unit: "MtCO₂e",
    conditionality: "Mixed",
    metricType: "emissions-reduction",
  },
  {
    id: "t3",
    sectorId: "energy",
    targetText: "Increase electricity generation capacity from 1,276.2 MW in 2020 to 3,500 MW by 2025 and 4,200 MW by 2030. Increase the share of population with access to electricity from 24% in 2020 to 60% by 2025 and 75% by 2030. Increase clean energy share for cooking from 15% (2020) to 50% (2025) to 65% (2030).",
    targetYear: 2030,
    baselineYear: 2020,
    baselineValue: 1276.2,
    targetValue: 4200,
    unit: "MW",
    conditionality: "Mixed",
    metricType: "electricity-capacity",
  },

  // ── Transport (new NDC 2022 sector) ────────────────────────────────────────
  {
    id: "t5",
    sectorId: "transport",
    targetText: "Limit transport sector GHG emissions to 6.8 MtCO₂e by 2030 — a 29% reduction below BAU of 9.6 MtCO₂e (-2.78 MtCO₂e). Measures: road fuel efficiency improvement (20% by 2030, GFEI 50by50), 1% per year alternative fuel switch, 200 e-buses in GKMA, 100 km NMT corridors in Kampala, 61 km passenger rail rehabilitation, BRT (101 km in GKMA by 2030). Transport is a new sector added in Uganda's Updated NDC 2022.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 4.2,
    targetValue: 6.8,
    unit: "MtCO₂e",
    conditionality: "Conditional",
    metricType: "emissions-reduction",
  },

  // ── Waste ─────────────────────────────────────────────────────────────────
  {
    id: "t6",
    sectorId: "waste",
    targetText: "Limit waste sector GHG emissions to 2.09 MtCO₂e by 2030 — a 34.8% reduction below BAU of 3.19 MtCO₂e (-1.10 MtCO₂e). Measures: Green Cities Waste Management (5 cities + 15 municipalities: solid waste reduction, recycling, reuse, wastewater treatment in Kampala, Gulu, Mbarara, Hoima, Mbale) and Schools Bio-Latrines NAMA. Waste is a new sector added in Uganda's Updated NDC 2022.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 2.08,
    targetValue: 2.09,
    unit: "MtCO₂e",
    conditionality: "Conditional",
    metricType: "emissions-reduction",
  },

  // ── IPPU ──────────────────────────────────────────────────────────────────
  {
    id: "t7",
    sectorId: "ippu",
    targetText: "Limit IPPU sector GHG emissions to 0.86 MtCO₂e by 2030 — a 14% reduction below BAU of 1.0 MtCO₂e (-0.14 MtCO₂e). Main measure: clinker substitution in cement production with pozzolana, fly-ash, or slag. Additional measure: circular economy management of refrigerants (Kigali Amendment). IPPU is a new sector added in Uganda's Updated NDC 2022.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 0.57,
    targetValue: 0.86,
    unit: "MtCO₂e",
    conditionality: "Conditional",
    metricType: "emissions-reduction",
  },

  // ── Agriculture ───────────────────────────────────────────────────────────
  {
    id: "t8",
    sectorId: "agriculture",
    targetText: "Increase the proportion of farmers practicing sustainable land management (including climate-smart agriculture, agroforestry) from 31.7% to 51.2% by 2025 and an estimated 70.7% by 2030. Area under irrigation to grow from 19,776 ha to 28,934 ha by 2025 and an estimated 152,622 ha by 2030. Agriculture measures contribute to the AFOLU NDC target (no standalone agriculture emissions target in NDC 2022).",
    targetYear: 2030,
    baselineYear: 2020,
    baselineValue: 31.7,
    targetValue: 70.7,
    unit: "% CSA adoption",
    conditionality: "Mixed",
    metricType: "activity-share",
  },

  // ── Electricity access (adaptation sub-target) ────────────────────────────
  {
    id: "t10",
    sectorId: "energy",
    targetText: "Increase the proportion of the population with access to electricity from 24% (2020) to 60% by 2025 and 75% by 2030. Increase the share of clean energy for cooking from 15% to 65% by 2030, reducing biomass share from 88% to 40%. Adaptation target under the Energy sector with mitigation co-benefits.",
    targetYear: 2030,
    baselineYear: 2020,
    baselineValue: 24,
    targetValue: 75,
    unit: "% electricity access",
    conditionality: "Mixed",
    metricType: "electricity-access",
  },
];

/* ── NDC Activities (fallback for the bundled catalog API) ──
 * Source: Uganda Updated NDC (Sept 2022). Only NDC-traceable fields are kept.
 * Named focal points/emails and assumed per-activity district lists were removed
 * in the June 2026 data audit; districts remain only where the NDC names locations. */

export const ndcActivities: NDCActivity[] = [
  {
    id: "a1", targetId: "t1", name: "National Reforestation Programme",
    description: "Plant 40 million trees (launched March 2021) across degraded landscapes with focus on indigenous species; scale to 3 billion trees by 2030",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Forestry Sector Support Department",
    implementationLevel: "national",
  },
  {
    id: "a2", targetId: "t1", name: "REDD+ Strategy Implementation",
    description: "Implement Uganda's National REDD+ Strategy and Action Plan (MWE 2017) — reduce deforestation via collaborative forest management, payments for ecosystem services, and commercial woodlots",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Climate Change Department",
    implementationLevel: "national",
  },
  {
    id: "a11", targetId: "t1", name: "Commercial Plantation Scale-Up",
    description: "Commercial transmission-pole/timber plantations (5 MtCO₂e abatement potential) and bioenergy woodlots (2.9 MtCO₂e) to reduce demand on natural forests",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Forestry Sector Support Department",
    implementationLevel: "national",
  },
  {
    id: "a3", targetId: "t2", name: "Community Forest Restoration",
    description: "Community-led forest restoration targeting 500,000 ha; 100,000 ha of natural forest regeneration and 100,000 ha enrichment planting in degraded reserves",
    responsibleMinistry: "Ministry of Water and Environment",
    implementationLevel: "national",
  },
  {
    id: "a12", targetId: "t9", name: "Wetland Demarcation and Restoration Programme",
    description: "Demarcate, gazette, and restore degraded wetlands; increase coverage from 8.9% to 12% of land area by 2030 (GCF Wetlands Project); peatland restoration in Nile Basin",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Wetlands Management Department",
    implementationLevel: "national",
  },
  {
    id: "a4", targetId: "t4", name: "Renewable Energy Generation Scale-Up",
    description: "756.8 MW additional hydro, 25 MW bagasse, 20 MW solar, 20 MW wind capacity to come online 2015–2030; reduce transmission and distribution losses",
    responsibleMinistry: "Ministry of Energy and Mineral Development",
    responsibleDepartment: "Renewable Energy Department",
    implementationLevel: "national",
  },
  {
    id: "a6", targetId: "t4", name: "Energy Efficiency & Fuel Switch Programme",
    description: "Improved charcoal kiln efficiency (12%→75%); industrial energy efficiency and fuel switching; commercial/institutional cookstove upgrades (50% of schools in improved charcoal stoves by 2030)",
    responsibleMinistry: "Ministry of Energy and Mineral Development",
    responsibleDepartment: "Energy Efficiency Unit",
    implementationLevel: "national",
  },
  {
    id: "a5", targetId: "t3", name: "Rural Electrification Programme",
    description: "Extend electricity access to 75% of population by 2030; deploy solar/wind-powered water supply systems; 65,000 improved cookstoves/year in residential sector",
    responsibleMinistry: "Ministry of Energy and Mineral Development",
    implementationLevel: "national",
  },
  {
    id: "a7", targetId: "t5", name: "GKMA Bus Rapid Transit (BRT)",
    description: "Implement 101 km of BRT in Greater Kampala Metropolitan Area by 2030; introduce 200+ e-buses; parking management to reduce private vehicle use",
    responsibleMinistry: "Ministry of Works and Transport",
    responsibleDepartment: "Transport Planning",
    implementationLevel: "district",
    districts: ["Kampala", "Wakiso", "Mukono"],
  },
  {
    id: "a13", targetId: "t5", name: "Road Fuel Efficiency & NMT Infrastructure",
    description: "Achieve 20% road fuel economy improvement by 2030 (GFEI 50by50 with 10-year time-lag); 100 km NMT corridors in Kampala + 100 km in secondary cities; 61 km MGR passenger rail rehabilitation",
    responsibleMinistry: "Ministry of Works and Transport",
    implementationLevel: "national",
  },
  {
    id: "a8", targetId: "t6", name: "Green Cities Waste Management Programme",
    description: "Comprehensive waste management (solid waste + wastewater) for 5 cities (Kampala, Gulu, Mbarara, Hoima, Mbale) and 15 municipalities; reduce, recycle, reuse; acquire land for sanitation/drainage infrastructure",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Environmental Management",
    implementationLevel: "both",
    districts: ["Kampala", "Gulu", "Mbarara", "Hoima", "Mbale"],
  },
  {
    id: "a9", targetId: "t7", name: "Clinker Substitution in Cement (IPPU)",
    description: "Substitute clinker with pozzolana, fly-ash, or slag in cement production to reduce process emissions; lower clinker fraction across Portland and Pozzolana Portland Cement",
    responsibleMinistry: "Ministry of Trade, Industry and Co-operatives",
    implementationLevel: "national",
  },
  {
    id: "a14", targetId: "t7", name: "HFC Phase-Down / Kigali Amendment",
    description: "Implement Kigali Amendment to phase down HFC consumption; circular economy management of refrigerants in cooling equipment",
    responsibleMinistry: "Ministry of Water and Environment",
    implementationLevel: "national",
  },
  {
    id: "a10", targetId: "t8", name: "Climate-Smart Agriculture Rollout",
    description: "Scale climate-smart agriculture (CSA) from 31.7% to 70.7% of farmers by 2030; expand irrigation from 19,776 to 152,622 ha; 40 million-tree agroforestry campaign; livestock management in cattle corridor (2.9 MtCO₂e reduction potential)",
    responsibleMinistry: "Ministry of Agriculture, Animal Industry and Fisheries",
    responsibleDepartment: "Crop Production Department",
    implementationLevel: "national",
  },
];

/* ── Mock Observed Data ── */

function makeHistorical(baseline: number, start: number, end: number, annualChange: number): ObservedDataPoint[] {
  const data: ObservedDataPoint[] = [];
  for (let y = start; y <= end; y++) {
    const elapsed = y - start;
    data.push({
      year: y,
      value: Math.round((baseline + annualChange * elapsed) * 100) / 100,
      target: Math.round((baseline - (baseline * 0.03 * elapsed / (end - start + 1))) * 100) / 100,
    });
  }
  return data;
}

function makeProjection(lastValue: number, target: number, start: number, end: number): ObservedDataPoint[] {
  const data: ObservedDataPoint[] = [];
  const totalYears = end - start;
  for (let y = start; y <= end; y++) {
    const elapsed = y - start;
    data.push({
      year: y,
      value: Math.round((lastValue + (target - lastValue) * (elapsed / totalYears)) * 100) / 100,
      target: Math.round((lastValue + (target * 0.95 - lastValue) * (elapsed / totalYears)) * 100) / 100,
    });
  }
  return data;
}

export const observedDataSets: ObservedDataSet[] = [
  // t0: Economy-wide (90.1 MtCO2e in 2015, growing toward 112.1 NDC target)
  {
    targetId: "t0",
    dataProviders: ["Uganda GHG National Inventory", "Climate TRACE"],
    historicalData: makeHistorical(90.1, 2015, 2024, 2.2),
    projectionBaseline: makeProjection(109.9, 112.1, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "warning", lastUpdated: "2024-11-01T00:00:00Z", isValidated: false },
  },
  // t1: AFOLU emissions (NDC 2022 scale: 77.6 MtCO2e 2015, growing toward 91.8 NDC target)
  {
    targetId: "t1",
    dataProviders: ["Earth Observation (Global Forest Watch)", "National Forestry Authority MRV"],
    historicalData: makeHistorical(77.6, 2015, 2024, 1.2),
    projectionBaseline: makeProjection(89.2, 91.8, 2025, 2030),
    provenance: { sourceType: "observed-eo", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "warning", lastUpdated: "2024-11-15T08:30:00Z", isValidated: false },
  },
  // t2: Forest cover (12.5% in 2020, target 21% by 2030)
  {
    targetId: "t2",
    dataProviders: ["Earth Observation (Copernicus)", "National Forestry Authority"],
    historicalData: makeHistorical(12.5, 2020, 2024, 0.6),
    projectionBaseline: makeProjection(14.9, 21, 2025, 2030),
    provenance: { sourceType: "observed-eo", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "ok", lastUpdated: "2024-10-20T14:00:00Z", isValidated: true },
  },
  // t9: Wetlands coverage (8.9% in 2020, target 12% by 2030)
  {
    targetId: "t9",
    dataProviders: ["National Wetlands Atlas", "Ministry of Water and Environment"],
    historicalData: makeHistorical(8.9, 2020, 2024, 0.12),
    projectionBaseline: makeProjection(9.38, 12, 2025, 2030),
    provenance: { sourceType: "observed-eo", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "missing", lastUpdated: "2023-12-01T00:00:00Z", isValidated: false },
  },
  // t4: Energy stationary (5.66 MtCO2e 2015, growing toward 10.10 NDC target)
  {
    targetId: "t4",
    dataProviders: ["Emissions Tracing (Climate TRACE)", "Ministry MRV"],
    historicalData: makeHistorical(5.66, 2015, 2024, 0.42),
    projectionBaseline: makeProjection(9.44, 10.10, 2025, 2030),
    provenance: { sourceType: "observed-emissions-tracing", mrvOwnerMinistry: "Ministry of Energy and Mineral Development", qaqcStatus: "warning", lastUpdated: "2024-08-15T12:00:00Z", isValidated: false },
  },
  // t3: Electricity generation capacity (1,276 MW in 2020, target 4,200 MW)
  {
    targetId: "t3",
    dataProviders: ["Uganda Electricity Regulatory Authority", "Ministry MRV"],
    historicalData: makeHistorical(1276.2, 2020, 2024, 180),
    projectionBaseline: makeProjection(1996.2, 4200, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Energy and Mineral Development", qaqcStatus: "ok", lastUpdated: "2024-09-01T10:00:00Z", isValidated: true },
  },
  // t5: Transport emissions (4.2 MtCO2e 2015, growing toward 6.8 NDC target)
  {
    targetId: "t5",
    dataProviders: ["Emissions Tracing (Climate TRACE)", "Ministry of Works and Transport MRV"],
    historicalData: makeHistorical(4.2, 2015, 2024, 0.35),
    projectionBaseline: makeProjection(7.35, 6.8, 2025, 2030),
    provenance: { sourceType: "observed-emissions-tracing", mrvOwnerMinistry: "Ministry of Works and Transport", qaqcStatus: "missing", lastUpdated: "2023-12-01T09:00:00Z", isValidated: false },
  },
  // t6: Waste emissions (2.08 MtCO2e 2015, target 2.09 MtCO2e — constrain at BAU)
  {
    targetId: "t6",
    dataProviders: ["Emissions Tracing", "NEMA"],
    historicalData: makeHistorical(2.08, 2015, 2024, 0.07),
    projectionBaseline: makeProjection(2.71, 2.09, 2025, 2030),
    provenance: { sourceType: "observed-emissions-tracing", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "ok", lastUpdated: "2024-07-01T11:00:00Z", isValidated: true },
  },
  // t7: IPPU (0.57 MtCO2e 2015, target 0.86 MtCO2e — constrain at BAU)
  {
    targetId: "t7",
    dataProviders: ["Ministry MRV", "Uganda Bureau of Statistics"],
    historicalData: makeHistorical(0.57, 2015, 2024, 0.024),
    projectionBaseline: makeProjection(0.786, 0.86, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "inconsistent", lastUpdated: "2024-03-15T10:00:00Z", isValidated: false },
  },
  // t8: CSA adoption (31.7% 2020 → 70.7% 2030 estimate)
  {
    targetId: "t8",
    dataProviders: ["Ministry MRV", "FAO"],
    historicalData: makeHistorical(31.7, 2020, 2024, 2.0),
    projectionBaseline: makeProjection(39.7, 70.7, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Agriculture, Animal Industry and Fisheries", qaqcStatus: "warning", lastUpdated: "2024-06-01T08:00:00Z", isValidated: false },
  },
  // t10: Electricity access (24% 2020, target 75% by 2030)
  {
    targetId: "t10",
    dataProviders: ["Uganda Bureau of Statistics", "ERA"],
    historicalData: makeHistorical(24, 2020, 2024, 4.0),
    projectionBaseline: makeProjection(40, 75, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Energy and Mineral Development", qaqcStatus: "ok", lastUpdated: "2024-09-01T10:00:00Z", isValidated: true },
  },
];

/* ── NDC Mitigation Options (fallback for the bundled catalog API) ──
 * Source: Uganda Updated NDC (Sept 2022) mitigation analysis. Title/description and
 * target/sector linkage are NDC-traceable; emissionsReductionPotential is an
 * indicative sector-level estimate. cost/confidence are indicative inputs used only
 * by the Climate Finance screening tool (not shown as data in the tab). Foreign
 * "best practice" case studies were removed in the June 2026 data audit. */

export const mitigationOptions: MitigationOption[] = [
  {
    id: "m1", targetId: "t1", sectorId: "afolu",
    title: "Payment for Ecosystem Services (PES)",
    description: "Establish PES schemes to incentivize forest conservation by local communities; target 500,000 ha",
    emissionsReductionPotential: 2.5, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 15, costCurrency: "USD", costMagnitude: "million/yr",
    confidence: "medium",
  },
  {
    id: "m2", targetId: "t1", sectorId: "afolu",
    title: "Commercial Plantation Expansion",
    description: "Scale up commercial timber/pole/bioenergy woodlot plantations on degraded lands (~10 MtCO₂e combined abatement potential)",
    emissionsReductionPotential: 3.8, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 45, costCurrency: "USD", costMagnitude: "million",
    confidence: "high",
  },
  {
    id: "m8", targetId: "t1", sectorId: "afolu",
    title: "Improved Charcoal Kilns (AFOLU Energy Efficiency)",
    description: "Scale up efficient charcoal production technology from 12% (2020) to 75% kiln efficiency by 2030; ~3.37 MtCO₂e reduction potential",
    emissionsReductionPotential: 3.37, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 20, costCurrency: "USD", costMagnitude: "million",
    confidence: "medium",
  },
  {
    id: "m3", targetId: "t4", sectorId: "energy",
    title: "Mini-Grid Solar Deployment",
    description: "Deploy 200 solar mini-grids in off-grid rural areas; part of total 4,200 MW generation target",
    emissionsReductionPotential: 0.8, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 120, costCurrency: "USD", costMagnitude: "million",
    confidence: "high",
  },
  {
    id: "m4", targetId: "t4", sectorId: "energy",
    title: "Improved Cookstove Distribution",
    description: "Distribute 65,000 improved cookstoves/year and promote cooking fuel switch to electricity (50% of cooking by 2025)",
    emissionsReductionPotential: 1.09, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 25, costCurrency: "USD", costMagnitude: "million",
    confidence: "medium",
  },
  {
    id: "m5", targetId: "t5", sectorId: "transport",
    title: "E-Buses & BRT for Greater Kampala",
    description: "Introduce 200+ e-buses in GKMA; implement 101 km BRT corridors; target 29% below BAU transport emissions by 2030",
    emissionsReductionPotential: 0.54, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 200, costCurrency: "USD", costMagnitude: "million",
    confidence: "low",
  },
  {
    id: "m9", targetId: "t5", sectorId: "transport",
    title: "Road Fuel Efficiency Standards",
    description: "Implement GFEI 50by50 fuel economy improvement (20% by 2030); regulate imported vehicle fleet; ~1.86 MtCO₂e reduction potential",
    emissionsReductionPotential: 1.86, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 10, costCurrency: "USD", costMagnitude: "million",
    confidence: "medium",
  },
  {
    id: "m6", targetId: "t6", sectorId: "waste",
    title: "Green Cities Waste Management",
    description: "Comprehensive solid waste + wastewater management in 5 cities and 15 municipalities; ~1.1 MtCO₂e reduction potential by 2030",
    emissionsReductionPotential: 1.1, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 80, costCurrency: "USD", costMagnitude: "million",
    confidence: "medium",
  },
  {
    id: "m7", targetId: "t8", sectorId: "agriculture",
    title: "Agroforestry Integration Programme",
    description: "Promote agroforestry across 1.3 million ha of farmland by 2030 (Aichi Biodiversity Target 15); part of CSA adoption target",
    emissionsReductionPotential: 1.5, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 35, costCurrency: "USD", costMagnitude: "million",
    confidence: "high",
  },
];

/* ── Utility functions ── */

export function getTargetsForSector(sectorId: SectorId): NDCTarget[] {
  if (sectorId === "economy-wide") return ndcTargets;
  return ndcTargets.filter(t => t.sectorId === sectorId);
}

export function getActivitiesForTarget(targetId: string): NDCActivity[] {
  return ndcActivities.filter(a => a.targetId === targetId);
}

export function getObservedDataForTarget(targetId: string): ObservedDataSet | undefined {
  return observedDataSets.find(d => d.targetId === targetId);
}

export function getMitigationOptionsForTarget(targetId: string, sectorId: SectorId): MitigationOption[] {
  return mitigationOptions.filter(m => m.targetId === targetId || m.sectorId === sectorId);
}

function latestObservedValue(historicalData: ObservedDataPoint[]): number | null {
  for (let i = historicalData.length - 1; i >= 0; i--) {
    const v = historicalData[i].value;
    if (v != null && !Number.isNaN(v)) return v;
  }
  return null;
}

function latestObservedYear(historicalData: ObservedDataPoint[]): number | null {
  for (let i = historicalData.length - 1; i >= 0; i--) {
    if (historicalData[i].value != null) return historicalData[i].year;
  }
  return null;
}

export function calculateProgress(target: NDCTarget, observedData?: ObservedDataSet): {
  percent: number | null;
  status: ProgressStatus;
} {
  if (!observedData || observedData.historicalData.length === 0) {
    return { percent: null, status: "unknown" };
  }

  const latestValue = latestObservedValue(observedData.historicalData);
  if (latestValue == null) {
    return { percent: null, status: "unknown" };
  }

  return calculateProgressUnified(
    {
      baselineYear: target.baselineYear,
      baselineValue: target.baselineValue,
      targetYear: target.targetYear,
      targetValue: target.targetValue,
      metricType: target.metricType,
    },
    {
      latestValue,
      latestYear: latestObservedYear(observedData.historicalData),
      qaqcStatus: observedData.provenance.qaqcStatus,
    },
  );
}

export function getDataCompleteness(): number {
  const total = observedDataSets.length;
  const validated = observedDataSets.filter(d =>
    d.provenance.isValidated && d.provenance.qaqcStatus === "ok"
  ).length;
  return Math.round((validated / total) * 100);
}

export function getLastRefreshTimestamp(): string {
  const dates = observedDataSets.map(d => new Date(d.provenance.lastUpdated).getTime());
  return new Date(Math.max(...dates)).toISOString();
}
