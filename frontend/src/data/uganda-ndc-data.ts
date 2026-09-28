/**
 * Uganda's NDC targets and the vocabulary around them.
 *
 * The commitments from Uganda's Updated NDC (September 2022) — what is promised,
 * by when, and whether each is unconditional or depends on international
 * support — plus the shared type definitions the rest of the app uses to talk
 * about sectors, targets and data quality.
 *
 * This is reference data transcribed from the official submission. Changing a
 * figure here changes what the app reports Uganda has promised, so any edit must
 * be checked against the source document.
 */
import {
  Trees, Flame, Droplets, Factory, Trash2, Bus, CloudRain, Wheat,
  type LucideIcon,
} from "lucide-react";
import { calculateProgress as calculateProgressUnified } from "@/lib/progress";
import { NDC_TARGETS } from "../../../config/ndcTargets.js";
import { MITIGATION_CONCEPTS } from "../../../shared/mitigationConcepts.js";

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
  /** NDC target path (ceiling or reduction line). */
  target?: number;
  /** 2030 no-policy trend (BAU), when target is a BAU-relative cap. */
  bauPath?: number;
}

export interface ObservedDataSet {
  targetId: string;
  dataProviders: string[];
  historicalData: ObservedDataPoint[];
  projectionBaseline: ObservedDataPoint[];
  provenance: DataProvenance;
}

export interface FinanceDataProvenance {
  abatementSource: string;
  costSource: string;
}

export interface MitigationOption {
  id: string;
  targetId: string;
  sectorId: SectorId;
  title: string;
  description: string;
  /** Indicative abatement estimate from NDC mitigation analysis (sector-level, not measured). */
  emissionsReductionPotential: number | null;
  emissionsReductionUnit: string;
  /** Indicative cost inputs — used only by the Climate Finance screening tool, not shown as data. */
  costEstimate: number | null;
  costCurrency: string;
  costMagnitude: string;
  confidence: ConfidenceLevel;
  financeProvenance?: FinanceDataProvenance;
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

/** Observations are supplied by live APIs or documented user imports.
 * Policy baselines are not annual measurements; never interpolate them into history.
 */
export const observedDataSets: ObservedDataSet[] = [];

/** Policy concepts only. Project costs and reductions require project evidence. */
export const mitigationOptions: MitigationOption[] = MITIGATION_CONCEPTS as MitigationOption[];

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

const NDC_SECTOR_BAU: Partial<Record<SectorId, number>> = {
  afolu: NDC_TARGETS.afolu.bau_2030,
  energy: NDC_TARGETS.energy.bau_2030,
  transport: NDC_TARGETS.transport.bau_2030,
  waste: NDC_TARGETS.waste.bau_2030,
  ippu: NDC_TARGETS.ippu.bau_2030,
};

/** Economy-wide and other targets not keyed by CT sector. */
const NDC_TARGET_BAU_2030: Partial<Record<string, number>> = {
  t0: 148.8,
};

export function bau2030ForTarget(target: NDCTarget): number | null {
  return NDC_TARGET_BAU_2030[target.id] ?? NDC_SECTOR_BAU[target.sectorId] ?? null;
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
      bau2030: bau2030ForTarget(target),
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
  if (total === 0) return 0;
  const validated = observedDataSets.filter(d =>
    d.provenance.isValidated && d.provenance.qaqcStatus === "ok"
  ).length;
  return Math.round((validated / total) * 100);
}

export function getLastRefreshTimestamp(): string | null {
  const dates = observedDataSets.map(d => new Date(d.provenance.lastUpdated).getTime());
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates)).toISOString();
}
