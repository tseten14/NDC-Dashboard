/**
 * Uganda's development strategies.
 *
 * The targets from the national strategies that sit alongside the NDC — NDP IV,
 * Tenfold, Vision 2040 — with their validation status and investment readiness,
 * so climate and development commitments can be viewed together.
 */
/* ═══════════════════════════════════════════════════════════════
   Uganda NDC & Strategy Explorer – Unified Data Model
   ═══════════════════════════════════════════════════════════════ */

/* ── Enums ── */

export type StrategyId = "STRAT-NDC" | "STRAT-TENFOLD" | "STRAT-NDPIV" | "STRAT-V2040" | "STRAT-ASSP" | string;
export type ViewMode = "policy" | "economic";
export type ValidationFilter = "all" | "verified" | "preliminary";
export type ValidationStatus = "Preliminary" | "Verified";
export type InvestmentReadiness = "NotReady" | "Emerging" | "Pipeline" | "Bankable";
export type ProjectRole = "DataOwner" | "Validator" | "DecisionMaker" | "Liaison" | "Consulted" | "Responsible";
export type ActorType = "Person" | "Org";
export type KPICategory = "NDC" | "Economic" | "FoodSecurity" | "EnergyReliability" | "ProgrammeDelivery" | "Adaptation" | "Budget";
export type Frequency = "Q" | "S" | "A" | "M";
export type AccessMethod = "upload" | "api" | "manual";
export type ExportType = "CRT_BTR_CSV" | "JSON_API" | "PDF_SUMMARY";
export type ActivitySector = "AFOLU" | "Energy" | "Industry" | "Transport" | "Waste" | "Other";

/* ── Interfaces ── */

export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  owner_org: string;
  political_salience_rank: number;
  is_active: boolean;
}

export interface Programme {
  id: string;
  program_name: string;
  program_code: string;
  lead_ministry: string;
  mission: string;
  kpi_refs: string[];
  indicators?: string[];
  core_targets?: string[];
}

export interface StrategyLink {
  strategy_id: StrategyId;
  anchor_or_program_code: string;
}

export interface Activity {
  id: string;
  title: string;
  sector: ActivitySector;
  description: string;
  strategy_links: StrategyLink[];
  budget_code_alignment: string;
  investment_readiness_level: InvestmentReadiness;
  ministry_badges: string[];
  district_tags: string[];
  kpi_links: string[];
  data_owner_id: string;
  validator_id: string;
  decision_owner_id: string;
}

export interface KPITarget {
  strategy_id: StrategyId;
  target_value: number;
  target_year: number;
}

export interface KPI {
  id: string;
  kpi_name: string;
  category: KPICategory;
  unit: string;
  frequency: Frequency;
  data_source_id: string;
  calculation_note: string;
  uncertainty_note: string;
  is_proxy: boolean;
  formula: string;
  inputs: string[];
  targets: KPITarget[];
}

export interface ProgressRecord {
  id: string;
  kpi_id: string;
  period_start: string;
  period_end: string;
  value: number;
  validation_status: ValidationStatus;
  provenance_note: string;
  last_updated_by: string;
}

export interface Actor {
  id: string;
  type: ActorType;
  display_name: string;
  org_unit: string;
  title_or_role: string;
  email: string;
  phone: string;
  project_role: ProjectRole;
  notes: string;
}

export interface DataSource {
  id: string;
  name: string;
  owner_org: string;
  access_method: AccessMethod;
  update_frequency: Frequency;
  format: string;
  contact_actor_id: string;
}

export interface ProjectionDriver {
  kpi_id: string;
  assumption_delta_or_path: string;
}

export interface Projection {
  id: string;
  name: string;
  assumptions_note: string;
  start_year: number;
  end_year: number;
  drivers: ProjectionDriver[];
  outputs: { kpi_id: string; projected_series: number[] }[];
  linked_strategies: StrategyId[];
}

export interface ExportRecord {
  id: string;
  export_type: ExportType;
  filter_params: Record<string, string>;
  generated_by: string;
  generated_at: string;
  file_link: string;
}

/* ═══════════════════════════════════════════════════════════════
   REFERENCE DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */

export const strategies: Strategy[] = [
  { id: "STRAT-NDC", name: "NDC", description: "Uganda's Nationally Determined Contribution (mitigation & adaptation).", owner_org: "MWE-CCD", political_salience_rank: 1, is_active: true },
  { id: "STRAT-TENFOLD", name: "Tenfold Growth Strategy", description: "Government's economic acceleration plan focused on exports, productivity, jobs.", owner_org: "MoFPED", political_salience_rank: 0, is_active: true },
  { id: "STRAT-NDPIV", name: "NDP IV", description: "Fourth National Development Plan (2025/26–2029/30) with 18 programmes.", owner_org: "NPA", political_salience_rank: 0, is_active: true },
  { id: "STRAT-V2040", name: "Vision 2040", description: "Long-term socio-economic transformation framework.", owner_org: "NPA", political_salience_rank: 2, is_active: true },
  { id: "STRAT-ASSP", name: "ASSP", description: "Agriculture Sector Strategic Plan (climate-smart agriculture & food security).", owner_org: "MAAIF", political_salience_rank: 3, is_active: true },
];

export const programmes: Programme[] = [
  { id: "NDPIV-01", program_name: "Agro-Industrialization", program_code: "NDPIV-01", lead_ministry: "MAAIF", mission: "Transform agriculture from subsistence to commercial scale, enhance agro-industrial output, food security, exports, and incomes.", kpi_refs: ["KPI-IRR-HA", "KPI-YIELD-IX"], indicators: ["% of households engaged in commercial agriculture", "Irrigated land area (ha)", "Agricultural export value (USD)", "Food production index", "Post-harvest loss rate", "CSA adoption rate", "Yield stability index"], core_targets: ["Increase agricultural value-added", "Expand irrigation coverage (esp. solar-powered)", "Increase agro-processing capacity", "Boost agricultural exports", "Reduce post-harvest losses"] },
  { id: "NDPIV-02", program_name: "Mineral Development", program_code: "NDPIV-02", lead_ministry: "MEMD", mission: "Unlock mineral wealth via sustainable extraction, local beneficiation, and export competitiveness.", kpi_refs: ["KPI-ERW-CO2"], indicators: ["% of minerals processed domestically", "Export value of processed minerals", "Number of licensed mineral operators", "ERW feedstock tonnage", "Mining sector jobs created"], core_targets: ["Increase processing of critical minerals", "Strengthen geological surveys", "Establish mineral beneficiation plants", "Expand artisanal mining formalization"] },
  { id: "NDPIV-03", program_name: "Sustainable Energy Development", program_code: "NDPIV-03", lead_ministry: "MEMD", mission: "Provide reliable, affordable, sustainable energy to drive industrialization and growth.", kpi_refs: ["KPI-RE-MW", "KPI-RELIAB"], indicators: ["Installed generation capacity (MW)", "Capacity factor (%)", "Electricity access rate (%)", "SAIDI/SAIFI (reliability metrics)", "Renewable share of energy mix", "Industrial electricity tariffs"], core_targets: ["Increase generation capacity, esp. renewable", "Improve grid reliability", "Expand electricity access", "Reduce outages"] },
  { id: "NDPIV-04", program_name: "Tourism Development", program_code: "NDPIV-04", lead_ministry: "MTWA", mission: "Build a competitive, sustainable tourism sector to generate revenue and jobs.", kpi_refs: [], indicators: ["Tourism revenue (USD)", "Visitor arrivals", "Tourism employment", "Hotel occupancy rates"], core_targets: ["Increase tourist arrivals and spending", "Develop tourism infrastructure", "Market Uganda regionally/internationally"] },
  { id: "NDPIV-05", program_name: "Trade, Industry & Cooperatives", program_code: "NDPIV-05", lead_ministry: "MTIC", mission: "Accelerate industrialization, grow exports, strengthen cooperatives for transformation.", kpi_refs: ["KPI-EXPORT"], indicators: ["Manufacturing value-added (% GDP)", "Export volume/value", "Number of functional cooperatives", "Industrial productivity index"], core_targets: ["Increase manufacturing value-added", "Strengthen cooperatives", "Boost exports", "Improve logistics and standards"] },
  { id: "NDPIV-06", program_name: "Transport & Integrated Logistics", program_code: "NDPIV-06", lead_ministry: "MoWT", mission: "Develop efficient transport and logistics to cut trade costs and raise competitiveness.", kpi_refs: [], indicators: ["Logistics Performance Index (LPI)", "% of paved roads", "Transport cost index", "Freight volumes moved"], core_targets: ["Expand paved road network", "Improve logistics performance", "Develop rail and water transport corridors"] },
  { id: "NDPIV-07", program_name: "ICT Development", program_code: "NDPIV-07", lead_ministry: "MoICT&NG", mission: "Advance digital infrastructure, innovation, and data governance.", kpi_refs: [], indicators: ["Internet penetration rate (%)", "Mobile broadband coverage", "E-government service uptime", "Data governance maturity index"], core_targets: ["Increase broadband penetration", "Expand ICT innovation hubs", "Improve digital public services", "Strengthen cyber readiness"] },
  { id: "NDPIV-08", program_name: "Sustainable Urbanization & Housing", program_code: "NDPIV-08", lead_ministry: "MoLHUD", mission: "Promote orderly, resilient, inclusive urbanization and adequate housing.", kpi_refs: [], indicators: ["% urban population in adequate housing", "Urban infrastructure coverage", "Slum population (%)"], core_targets: ["Increase access to adequate housing", "Improve urban planning", "Expand basic urban infrastructure"] },
  { id: "NDPIV-09", program_name: "Water Resources Management & Development", program_code: "NDPIV-09", lead_ministry: "MWE", mission: "Ensure sustainable utilization, protection, and development of water resources.", kpi_refs: [], indicators: ["Access to safe water (%)", "Water quality index", "Non-revenue water (%)", "Irrigation water availability"], core_targets: ["Expand access to safe water", "Improve water resource monitoring", "Reduce water losses"] },
  { id: "NDPIV-10", program_name: "Environment, Natural Resources, Climate Change & Land Management", program_code: "NDPIV-10", lead_ministry: "MWE", mission: "Restore ecosystems, strengthen climate resilience, and promote sustainable land use.", kpi_refs: ["KPI-CO2-RED", "KPI-AFOLU-DISP"], indicators: ["Forest cover (%)", "Wetlands restored (ha)", "Land degradation index", "Climate vulnerability index"], core_targets: ["Reduce deforestation", "Expand wetlands restoration", "Improve climate adaptation systems"] },
  { id: "NDPIV-11", program_name: "Private Sector Development", program_code: "NDPIV-11", lead_ministry: "MoFPED", mission: "Enable private sector–led growth, investment, and competitiveness.", kpi_refs: [], indicators: ["Private sector credit (% of GDP)", "Number of new enterprises", "Investment approvals (USD)", "Doing Business Index"], core_targets: ["Increase private investment", "Improve business environment", "Reduce cost of capital"] },
  { id: "NDPIV-12", program_name: "Public Sector Transformation", program_code: "NDPIV-12", lead_ministry: "OPM/PS", mission: "Improve efficiency, transparency, and service delivery across public sector.", kpi_refs: [], indicators: ["Public service satisfaction index", "Service delivery turnaround time", "E-government adoption score"], core_targets: ["Strengthen service delivery", "Modernize budgeting & planning", "Expand e-government systems"] },
  { id: "NDPIV-13", program_name: "Human Capital Development", program_code: "NDPIV-13", lead_ministry: "MoH/MoES", mission: "Build a healthy, educated, and skilled population.", kpi_refs: [], indicators: ["Literacy rate (%)", "Skilled birth attendance (%)", "Immunization coverage (%)", "TVET enrollment"], core_targets: ["Extend universal education access", "Improve health outcomes", "Expand technical and vocational skills"] },
  { id: "NDPIV-14", program_name: "Community Mobilization & Mindset Change", program_code: "NDPIV-14", lead_ministry: "MoGLSD", mission: "Mobilize communities for civic responsibility and participation in development.", kpi_refs: [], indicators: ["Household participation in PDM/wealth programmes", "Community engagement index", "Adoption of modern farming/business practices"], core_targets: ["Increase participation in development programs", "Improve household adoption of modern practices"] },
  { id: "NDPIV-15", program_name: "Governance & Security", program_code: "NDPIV-15", lead_ministry: "MoJCA/UPF/UPDF", mission: "Strengthen rule of law, justice, security, and democratic governance.", kpi_refs: [], indicators: ["Crime rate", "Case disposal rate", "Corruption perception index"], core_targets: ["Strengthen justice service delivery", "Improve security", "Reduce corruption"] },
  { id: "NDPIV-16", program_name: "Public Administration", program_code: "NDPIV-16", lead_ministry: "OPM/OP", mission: "Enhance coordination, leadership, and administrative efficiency.", kpi_refs: [], indicators: ["Number of policies implemented on time", "Cabinet decision implementation rate"], core_targets: ["Strengthen cabinet processes", "Improve administrative effectiveness"] },
  { id: "NDPIV-17", program_name: "Development Plan Implementation", program_code: "NDPIV-17", lead_ministry: "NPA", mission: "Ensure coordinated, effective NDP IV implementation and M&E.", kpi_refs: ["KPI-NDP-ALIGN"], indicators: ["Programme alignment score", "Budget absorption rate", "KPI reporting compliance (%)"], core_targets: ["Improve plan execution", "Strengthen monitoring & evaluation", "Reduce implementation bottlenecks"] },
  { id: "NDPIV-18", program_name: "Regional Balanced Development", program_code: "NDPIV-18", lead_ministry: "NPA/OPM", mission: "Reduce regional disparities and accelerate development in lagging regions.", kpi_refs: [], indicators: ["Regional GDP per capita", "Service delivery gap index", "Rural roads condition index"], core_targets: ["Increase investment in underserved regions", "Improve district service delivery", "Expand rural infrastructure"] },
];

// The previous prototype included invented activities, observations, targets,
// approval records and contact assignments. No operational feed is connected
// to these legacy views. Empty means unavailable, not zero activity.
export const actors: Actor[] = [];

export const dataSources: DataSource[] = [];

export const kpis: KPI[] = [];

export const activities: Activity[] = [];

export const progressRecords: ProgressRecord[] = [];

export const projections: Projection[] = [];

export const exportRecords: ExportRecord[] = [];

/* ── Utility functions ── */

export function getActor(id: string): Actor | undefined {
  return actors.find(a => a.id === id);
}

export function getKPI(id: string): KPI | undefined {
  return kpis.find(k => k.id === id);
}

export function getDataSource(id: string): DataSource | undefined {
  return dataSources.find(d => d.id === id);
}

export function getActivitiesForStrategy(strategyId: StrategyId): Activity[] {
  if (strategyId === "all") return activities;
  return activities.filter(a => a.strategy_links.some(l => l.strategy_id === strategyId));
}

export function getProgressForKPI(kpiId: string): ProgressRecord[] {
  return progressRecords.filter(p => p.kpi_id === kpiId);
}

export function getKPIsForActivity(activityId: string): KPI[] {
  const activity = activities.find(a => a.id === activityId);
  if (!activity) return [];
  return activity.kpi_links.map(id => kpis.find(k => k.id === id)).filter(Boolean) as KPI[];
}

export function computeKPIProgress(kpi: KPI): { value: number; target: number; pct: number; status: string } {
  const records = getProgressForKPI(kpi.id);
  const latest = records.length > 0 ? records[records.length - 1].value : 0;
  const primaryTarget = kpi.targets.length > 0 ? kpi.targets[0] : null;
  const targetVal = primaryTarget?.target_value ?? 1;
  const pct = Math.min(100, Math.round((latest / targetVal) * 100));
  const hasPreliminary = records.some(r => r.validation_status === "Preliminary");
  let status = "unknown";
  if (records.length === 0) status = "unknown";
  else if (pct >= 70) status = hasPreliminary ? "at-risk" : "on-track";
  else if (pct >= 40) status = "at-risk";
  else status = "off-track";
  return { value: latest, target: targetVal, pct, status };
}

export function generateProjectionSeries(kpi: KPI, projection: Projection): { year: number; baseline: number; scenario: number }[] {
  const records = getProgressForKPI(kpi.id);
  if (records.length === 0) return [];
  const startValue = records[records.length - 1].value;
  const driver = projection.drivers.find(d => d.kpi_id === kpi.id);
  const series: { year: number; baseline: number; scenario: number }[] = [];
  let baseVal = startValue;
  let scenVal = startValue;
  for (let y = projection.start_year; y <= projection.end_year; y++) {
    baseVal *= 1.03; // baseline 3% growth
    scenVal *= driver ? 1.08 : 1.03; // scenario growth if driver exists
    series.push({ year: y, baseline: Math.round(baseVal), scenario: Math.round(scenVal) });
  }
  return series;
}

/* ── Roadmap data ── */

export const roadmapPhases: { phase: string; period: string; milestones: string[] }[] = [];

export const raciData: Record<string, string> = {};
