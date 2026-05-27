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
  | "activity-share";
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

export interface FocalPoint {
  name: string;
  role: string;
  email: string;
}

export interface NDCActivity {
  id: string;
  targetId: string;
  name: string;
  description: string;
  responsibleMinistry: string;
  responsibleDepartment?: string;
  focalPoint: FocalPoint;
  implementationLevel: ImplementationLevel;
  districts?: string[]; // if district-level
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
  emissionsReductionPotential: number;
  emissionsReductionUnit: string;
  costEstimate: number;
  costCurrency: string;
  costMagnitude: string;
  confidence: ConfidenceLevel;
  bestPractices: BestPractice[];
}

export interface BestPractice {
  country: string;
  title: string;
  description: string;
  outcome: string;
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
  { id: "economy-wide", name: "Economy-wide", icon: CloudRain, description: "All sectors combined" },
  { id: "afolu", name: "AFOLU", icon: Trees, description: "Agriculture, Forestry & Other Land Use" },
  { id: "energy", name: "Energy", icon: Flame, description: "Energy Production & Renewable Energy" },
  { id: "transport", name: "Transport", icon: Bus, description: "Transportation & Mobility" },
  { id: "waste", name: "Waste", icon: Trash2, description: "Waste Management & Circular Economy" },
  { id: "ippu", name: "IPPU", icon: Factory, description: "Industrial Processes & Product Use" },
  { id: "agriculture", name: "Agriculture", icon: Wheat, description: "Agricultural Production & Land Management" },
];

/* ── Mock NDC Targets (Uganda NDC verbatim-style) ── */

export const ndcTargets: NDCTarget[] = [
  {
    id: "t1",
    sectorId: "afolu",
    targetText: "Reduce emissions from the forestry and land-use sector by 22% below BAU levels by 2030 through afforestation, reforestation, and reduced deforestation.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 42.5,
    targetValue: 33.15,
    unit: "MtCO₂e",
    conditionality: "Mixed",
    metricType: "emissions-reduction",
  },
  {
    id: "t2",
    sectorId: "afolu",
    targetText: "Increase national forest cover from 12.4% to 21% of total land area by 2030.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 12.4,
    targetValue: 21,
    unit: "% land area",
    conditionality: "Conditional",
    metricType: "forest-cover",
  },
  {
    id: "t3",
    sectorId: "energy",
    targetText: "Achieve 80% renewable energy in the national energy mix by 2030, up from 62% in 2015.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 62,
    targetValue: 80,
    unit: "% renewable",
    conditionality: "Unconditional",
    metricType: "renewable-energy",
  },
  {
    id: "t4",
    sectorId: "energy",
    targetText: "Reduce GHG emissions from the energy sector by 27% below BAU by 2030 through improved energy efficiency and renewable energy deployment.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 6.2,
    targetValue: 3.1,
    unit: "MtCO₂e",
    conditionality: "Mixed",
    metricType: "emissions-reduction",
  },
  {
    id: "t5",
    sectorId: "transport",
    targetText: "Shift 30% of freight transport to rail and water by 2030 and promote low-emission public transport in Kampala Metropolitan Area.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 5,
    targetValue: 30,
    unit: "% modal shift",
    conditionality: "Conditional",
    metricType: "transport-modal-shift",
  },
  {
    id: "t6",
    sectorId: "waste",
    targetText: "Reduce methane emissions from solid waste disposal by 40% through landfill gas capture, composting, and waste-to-energy by 2030.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 3.8,
    targetValue: 2.28,
    unit: "MtCO₂e",
    conditionality: "Unconditional",
    metricType: "emissions-reduction",
  },
  {
    id: "t7",
    sectorId: "ippu",
    targetText: "Reduce industrial process emissions by 20% through cleaner production standards and HFC phase-down by 2030.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 1.8,
    targetValue: 1.2,
    unit: "MtCO₂e",
    conditionality: "Conditional",
    metricType: "emissions-reduction",
  },
  {
    id: "t8",
    sectorId: "agriculture",
    targetText: "Promote climate-smart agriculture across 50% of agricultural land by 2030 to reduce emissions intensity per unit of output.",
    targetYear: 2030,
    baselineYear: 2015,
    baselineValue: 10,
    targetValue: 50,
    unit: "% CSA adoption",
    conditionality: "Mixed",
    metricType: "activity-share",
  },
];

/* ── Mock Activities ── */

export const ndcActivities: NDCActivity[] = [
  {
    id: "a1", targetId: "t1", name: "National Reforestation Programme",
    description: "Plant 3 billion trees by 2030 across degraded landscapes",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Forestry Sector Support Department",
    focalPoint: { name: "Dr. Sarah Namirembe", role: "Director, Forestry", email: "s.namirembe@mwe.go.ug" },
    implementationLevel: "both",
    districts: ["Kampala", "Wakiso", "Mukono", "Mbarara", "Gulu", "Lira"],
  },
  {
    id: "a2", targetId: "t1", name: "REDD+ Strategy Implementation",
    description: "Reduce emissions from deforestation and forest degradation",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Climate Change Department",
    focalPoint: { name: "Mr. Bob Natifu", role: "Commissioner, Climate Change", email: "b.natifu@mwe.go.ug" },
    implementationLevel: "national",
  },
  {
    id: "a3", targetId: "t2", name: "Community Forest Restoration",
    description: "Community-led forest restoration targeting 500,000 hectares",
    responsibleMinistry: "Ministry of Water and Environment",
    focalPoint: { name: "Ms. Grace Akello", role: "Senior Forest Officer", email: "g.akello@mwe.go.ug" },
    implementationLevel: "district",
    districts: ["Hoima", "Masindi", "Kibaale", "Kyenjojo", "Bundibugyo"],
  },
  {
    id: "a4", targetId: "t3", name: "Solar Energy Scale-Up",
    description: "Deploy 500 MW additional solar PV capacity by 2030",
    responsibleMinistry: "Ministry of Energy and Mineral Development",
    responsibleDepartment: "Renewable Energy Department",
    focalPoint: { name: "Eng. Peter Okwoko", role: "Director, Renewable Energy", email: "p.okwoko@memd.go.ug" },
    implementationLevel: "national",
  },
  {
    id: "a5", targetId: "t3", name: "Rural Electrification Programme",
    description: "Extend clean energy access to 80% of rural households",
    responsibleMinistry: "Ministry of Energy and Mineral Development",
    focalPoint: { name: "Ms. Irene Muloni", role: "Commissioner, Energy", email: "i.muloni@memd.go.ug" },
    implementationLevel: "both",
    districts: ["Soroti", "Arua", "Gulu", "Lira", "Moroto", "Kotido"],
  },
  {
    id: "a6", targetId: "t4", name: "Energy Efficiency Standards",
    description: "Implement mandatory energy efficiency standards for buildings and industry",
    responsibleMinistry: "Ministry of Energy and Mineral Development",
    responsibleDepartment: "Energy Efficiency Unit",
    focalPoint: { name: "Dr. James Opio", role: "Head of Standards", email: "j.opio@memd.go.ug" },
    implementationLevel: "national",
  },
  {
    id: "a7", targetId: "t5", name: "Kampala BRT System",
    description: "Construct and operationalize Bus Rapid Transit in Greater Kampala",
    responsibleMinistry: "Ministry of Works and Transport",
    responsibleDepartment: "Transport Planning",
    focalPoint: { name: "Eng. David Luyimbazi", role: "Director, Transport", email: "d.luyimbazi@mowt.go.ug" },
    implementationLevel: "district",
    districts: ["Kampala", "Wakiso", "Mukono"],
  },
  {
    id: "a8", targetId: "t6", name: "Landfill Gas Capture Programme",
    description: "Install methane capture at 10 major landfill sites nationwide",
    responsibleMinistry: "Ministry of Water and Environment",
    responsibleDepartment: "Environmental Management",
    focalPoint: { name: "Dr. Mary Goretti", role: "Environmental Inspector", email: "m.goretti@mwe.go.ug" },
    implementationLevel: "both",
    districts: ["Kampala", "Jinja", "Mbale", "Mbarara", "Gulu"],
  },
  {
    id: "a9", targetId: "t7", name: "HFC Phase-Down Programme",
    description: "Implement Kigali Amendment to phase down HFC consumption",
    responsibleMinistry: "Ministry of Water and Environment",
    focalPoint: { name: "Mr. Arnold Waiswa", role: "Ozone Officer", email: "a.waiswa@mwe.go.ug" },
    implementationLevel: "national",
  },
  {
    id: "a10", targetId: "t8", name: "Climate-Smart Agriculture Rollout",
    description: "Train 2 million farmers in climate-smart agricultural practices",
    responsibleMinistry: "Ministry of Agriculture, Animal Industry and Fisheries",
    responsibleDepartment: "Crop Production Department",
    focalPoint: { name: "Dr. Joseph Bazaale", role: "Director, Crop Resources", email: "j.bazaale@maaif.go.ug" },
    implementationLevel: "both",
    districts: ["Masaka", "Rakai", "Sembabule", "Pallisa", "Kumi", "Katakwi"],
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
  {
    targetId: "t1",
    dataProviders: ["Earth Observation (Global Forest Watch)", "National Forestry Authority MRV"],
    historicalData: makeHistorical(42.5, 2015, 2024, -0.85),
    projectionBaseline: makeProjection(34.85, 33.15, 2025, 2030),
    provenance: { sourceType: "observed-eo", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "ok", lastUpdated: "2024-11-15T08:30:00Z", isValidated: true },
  },
  {
    targetId: "t2",
    dataProviders: ["Earth Observation (Copernicus)", "National Forestry Authority"],
    historicalData: makeHistorical(12.4, 2015, 2024, 0.6),
    projectionBaseline: makeProjection(17.8, 21, 2025, 2030),
    provenance: { sourceType: "observed-eo", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "ok", lastUpdated: "2024-10-20T14:00:00Z", isValidated: true },
  },
  {
    targetId: "t3",
    dataProviders: ["Ministry MRV", "Uganda Electricity Regulatory Authority"],
    historicalData: makeHistorical(62, 2015, 2024, 1.5),
    projectionBaseline: makeProjection(75.5, 80, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Energy and Mineral Development", qaqcStatus: "ok", lastUpdated: "2024-09-01T10:00:00Z", isValidated: true },
  },
  {
    targetId: "t4",
    dataProviders: ["Emissions Tracing (Climate TRACE)", "Ministry MRV"],
    historicalData: makeHistorical(6.2, 2015, 2024, -0.15),
    projectionBaseline: makeProjection(5.0, 3.1, 2025, 2030),
    provenance: { sourceType: "observed-emissions-tracing", mrvOwnerMinistry: "Ministry of Energy and Mineral Development", qaqcStatus: "warning", lastUpdated: "2024-08-15T12:00:00Z", isValidated: false },
  },
  {
    targetId: "t5",
    dataProviders: ["Ministry MRV"],
    historicalData: makeHistorical(5, 2015, 2024, 0.8),
    projectionBaseline: makeProjection(12.2, 30, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Works and Transport", qaqcStatus: "missing", lastUpdated: "2023-12-01T09:00:00Z", isValidated: false },
  },
  {
    targetId: "t6",
    dataProviders: ["Emissions Tracing", "NEMA"],
    historicalData: makeHistorical(3.8, 2015, 2024, -0.12),
    projectionBaseline: makeProjection(2.72, 2.28, 2025, 2030),
    provenance: { sourceType: "observed-emissions-tracing", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "ok", lastUpdated: "2024-07-01T11:00:00Z", isValidated: true },
  },
  {
    targetId: "t7",
    dataProviders: ["Ministry MRV"],
    historicalData: makeHistorical(1.8, 2015, 2024, -0.03),
    projectionBaseline: makeProjection(1.55, 1.2, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Water and Environment", qaqcStatus: "inconsistent", lastUpdated: "2024-03-15T10:00:00Z", isValidated: false },
  },
  {
    targetId: "t8",
    dataProviders: ["Ministry MRV", "FAO"],
    historicalData: makeHistorical(10, 2015, 2024, 2.5),
    projectionBaseline: makeProjection(32.5, 50, 2025, 2030),
    provenance: { sourceType: "reported", mrvOwnerMinistry: "Ministry of Agriculture, Animal Industry and Fisheries", qaqcStatus: "warning", lastUpdated: "2024-06-01T08:00:00Z", isValidated: false },
  },
];

/* ── Mock Mitigation Options ── */

export const mitigationOptions: MitigationOption[] = [
  {
    id: "m1", targetId: "t1", sectorId: "afolu",
    title: "Payment for Ecosystem Services (PES)",
    description: "Establish PES schemes to incentivize forest conservation by local communities",
    emissionsReductionPotential: 2.5, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 15, costCurrency: "USD", costMagnitude: "million/yr",
    confidence: "medium",
    bestPractices: [
      { country: "Costa Rica", title: "National PES Programme", description: "Payments to landowners for forest conservation since 1997", outcome: "Forest cover increased from 21% to 52%" },
      { country: "Kenya", title: "Upper Tana Water Fund", description: "PES for watershed conservation upstream of Nairobi", outcome: "30% reduction in sedimentation" },
    ],
  },
  {
    id: "m2", targetId: "t1", sectorId: "afolu",
    title: "Commercial Tree Plantation Expansion",
    description: "Scale up commercial forestry plantations on degraded lands",
    emissionsReductionPotential: 3.8, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 45, costCurrency: "USD", costMagnitude: "million",
    confidence: "high",
    bestPractices: [
      { country: "Ethiopia", title: "Green Legacy Initiative", description: "Planted 5 billion trees in 2019-2020", outcome: "Significant reforestation of degraded highlands" },
    ],
  },
  {
    id: "m3", targetId: "t3", sectorId: "energy",
    title: "Mini-Grid Solar Deployment",
    description: "Deploy 200 solar mini-grids in off-grid rural areas",
    emissionsReductionPotential: 0.8, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 120, costCurrency: "USD", costMagnitude: "million",
    confidence: "high",
    bestPractices: [
      { country: "Tanzania", title: "Rural Energy Agency Mini-Grids", description: "Deployed 200+ mini-grids serving 300,000 customers", outcome: "60% reduction in kerosene usage" },
    ],
  },
  {
    id: "m4", targetId: "t4", sectorId: "energy",
    title: "Improved Cookstove Distribution",
    description: "Distribute 5 million improved cookstoves to reduce biomass fuel consumption",
    emissionsReductionPotential: 1.2, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 25, costCurrency: "USD", costMagnitude: "million",
    confidence: "medium",
    bestPractices: [
      { country: "Rwanda", title: "National Cookstove Programme", description: "Distributed 1.5M improved stoves to households", outcome: "40% reduction in firewood consumption" },
    ],
  },
  {
    id: "m5", targetId: "t5", sectorId: "transport",
    title: "Electric Bus Fleet for Kampala",
    description: "Introduce 500 electric buses for Kampala public transit system",
    emissionsReductionPotential: 0.4, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 200, costCurrency: "USD", costMagnitude: "million",
    confidence: "low",
    bestPractices: [
      { country: "Kenya", title: "BasiGo Electric Buses", description: "Electric bus deployment in Nairobi", outcome: "70% operating cost reduction vs diesel" },
    ],
  },
  {
    id: "m6", targetId: "t6", sectorId: "waste",
    title: "Waste-to-Energy Facility",
    description: "Build waste-to-energy plant processing 1,000 tonnes/day in Kampala",
    emissionsReductionPotential: 0.6, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 80, costCurrency: "USD", costMagnitude: "million",
    confidence: "medium",
    bestPractices: [
      { country: "South Africa", title: "Durban Landfill Gas-to-Energy", description: "Largest CDM landfill gas project in Africa", outcome: "Generates 7.5 MW and reduces 340ktCO₂e/yr" },
    ],
  },
  {
    id: "m7", targetId: "t8", sectorId: "agriculture",
    title: "Agroforestry Integration Programme",
    description: "Promote agroforestry systems across 1 million hectares of farmland",
    emissionsReductionPotential: 1.5, emissionsReductionUnit: "MtCO₂e/yr",
    costEstimate: 35, costCurrency: "USD", costMagnitude: "million",
    confidence: "high",
    bestPractices: [
      { country: "Malawi", title: "National Agroforestry Programme", description: "Integrated trees on 300,000 ha of farmland", outcome: "25% yield increase plus carbon sequestration" },
    ],
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
