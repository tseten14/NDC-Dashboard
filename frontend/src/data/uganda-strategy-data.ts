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
   SEED DATA
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

export const actors: Actor[] = [
  { id: "ACT-NICOLAS", type: "Person", display_name: "Nicolas Henriksson", org_unit: "UNFCCC Secretariat – Mitigation", title_or_role: "Coordination & Architecture", email: "", phone: "", project_role: "DecisionMaker", notes: "Product/architecture lead." },
  { id: "ACT-JOAQUIM", type: "Person", display_name: "Joaquim Barris", org_unit: "UNFCCC Secretariat – Data Services", title_or_role: "Data Standards & QA/QC", email: "", phone: "", project_role: "Validator", notes: "" },
  { id: "ACT-PAU", type: "Person", display_name: "Pau Tarragó Navarra", org_unit: "UNFCCC Secretariat", title_or_role: "Standards & Governance", email: "", phone: "", project_role: "Validator", notes: "" },
  { id: "ACT-EDWARD", type: "Person", display_name: "Edward Ssenyonjo", org_unit: "MWE – GIS & Mapping", title_or_role: "Coordinator", email: "", phone: "", project_role: "DataOwner", notes: "Spatial datasets; QA/QC (AFOLU)." },
  { id: "ACT-ISAAC", type: "Person", display_name: "Isaac Okiror", org_unit: "MWE – GHG Inventory", title_or_role: "Lead", email: "", phone: "", project_role: "DataOwner", notes: "NDC Excel tool; sector submissions." },
  { id: "ACT-MARK", type: "Person", display_name: "Mark Mutaahi", org_unit: "Carbon Access Lab", title_or_role: "Liaison", email: "", phone: "", project_role: "Liaison", notes: "National liaison; WG coordination." },
  { id: "ACT-PETER", type: "Person", display_name: "Nyeko Peter Benhur Odokonyero", org_unit: "STI / Mandulis Energy", title_or_role: "Advisor", email: "", phone: "", project_role: "Liaison", notes: "Strategy alignment; proxy indicators." },
  { id: "ACT-DAVID", type: "Person", display_name: "David Gonahasa", org_unit: "STI", title_or_role: "Coordinator", email: "", phone: "", project_role: "Liaison", notes: "Introductions; scheduling." },
  { id: "ACT-MOFPED-FOCAL", type: "Person", display_name: "MoFPED Focal (tbc)", org_unit: "MoFPED – Planning/Budget", title_or_role: "Budget/Planning", email: "", phone: "", project_role: "DecisionMaker", notes: "" },
  { id: "ACT-NPA-FOCAL", type: "Person", display_name: "NPA Focal (tbc)", org_unit: "NPA – M&E/Strategy", title_or_role: "M&E/Strategy", email: "", phone: "", project_role: "DecisionMaker", notes: "" },
  { id: "ACT-UBOS-FOCAL", type: "Person", display_name: "UBOS Focal (tbc)", org_unit: "UBOS – Statistics", title_or_role: "Data Steward", email: "", phone: "", project_role: "DataOwner", notes: "" },
  { id: "ACT-PLANET", type: "Person", display_name: "Dr. Flávia De Souza Mendes", org_unit: "Planet Labs", title_or_role: "EO Analytics", email: "", phone: "", project_role: "Consulted", notes: "AFOLU MRV remote sensing." },
  { id: "ACT-TRACE-GAVIN", type: "Person", display_name: "Gavin McCormick", org_unit: "Climate TRACE", title_or_role: "MRV & Emissions Tracing", email: "", phone: "", project_role: "Consulted", notes: "" },
  { id: "ACT-TRACE-LEKHA", type: "Person", display_name: "Lekha Sridhar", org_unit: "Climate TRACE", title_or_role: "MRV & Emissions Tracing", email: "", phone: "", project_role: "Consulted", notes: "" },
  { id: "ACT-QLIK", type: "Person", display_name: "Chuck Bannon (tbc)", org_unit: "QLIK", title_or_role: "Product Lead", email: "", phone: "", project_role: "Responsible", notes: "Feasibility; specs; build." },
  { id: "ACT-CA", type: "Org", display_name: "Climate Analytics", org_unit: "Analytics", title_or_role: "KPI Methods", email: "", phone: "", project_role: "Consulted", notes: "Policy-relevant KPIs & uncertainty." },
  { id: "ACT-CPR", type: "Org", display_name: "Climate Policy Radar", org_unit: "API", title_or_role: "Legal/Policy Data", email: "", phone: "", project_role: "Consulted", notes: "Legal obligations; best practices." },
  { id: "ACT-ITU", type: "Org", display_name: "International Telecommunication Union (ITU)", org_unit: "Standards", title_or_role: "Interoperability", email: "", phone: "", project_role: "Consulted", notes: "Digital governance; MoU fast-track." },
];

export const dataSources: DataSource[] = [
  { id: "DS-UBOS", name: "UBOS Official Statistics", owner_org: "UBOS", access_method: "api", update_frequency: "Q", format: "JSON/CSV", contact_actor_id: "ACT-UBOS-FOCAL" },
  { id: "DS-MWE-GHG", name: "MWE GHG Inventory", owner_org: "MWE", access_method: "upload", update_frequency: "A", format: "Excel/CSV", contact_actor_id: "ACT-ISAAC" },
  { id: "DS-PLANET", name: "Planet EO Feed (AFOLU)", owner_org: "Planet Labs", access_method: "api", update_frequency: "M", format: "API", contact_actor_id: "ACT-PLANET" },
  { id: "DS-TRACE", name: "TRACE Emissions Tracing", owner_org: "Climate TRACE", access_method: "api", update_frequency: "Q", format: "API", contact_actor_id: "ACT-TRACE-GAVIN" },
  { id: "DS-NPA", name: "NPA Programme M&E", owner_org: "NPA", access_method: "api", update_frequency: "Q", format: "JSON", contact_actor_id: "ACT-NPA-FOCAL" },
  { id: "DS-MOFPED", name: "MoFPED Budget (CCBT)", owner_org: "MoFPED", access_method: "api", update_frequency: "Q", format: "JSON/CSV", contact_actor_id: "ACT-MOFPED-FOCAL" },
];

export const kpis: KPI[] = [
  { id: "KPI-CO2-RED", kpi_name: "tCO2e_reduced", category: "NDC", unit: "tCO2e", frequency: "Q", data_source_id: "DS-MWE-GHG", calculation_note: "Sum of emissions avoided across activities.", uncertainty_note: "", is_proxy: false, formula: "sum(activity_emissions_avoided)", inputs: ["activity_emissions_avoided"], targets: [{ strategy_id: "STRAT-NDC", target_value: 1200000, target_year: 2026 }] },
  { id: "KPI-RE-MW", kpi_name: "RE_MW", category: "EnergyReliability", unit: "MW", frequency: "Q", data_source_id: "DS-UBOS", calculation_note: "Installed renewable capacity.", uncertainty_note: "", is_proxy: false, formula: "sum(plant_capacity_mw)", inputs: ["plant_capacity_mw"], targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 2000, target_year: 2027 }] },
  { id: "KPI-RELIAB", kpi_name: "reliability_proxy", category: "EnergyReliability", unit: "index_0_1", frequency: "Q", data_source_id: "DS-UBOS", calculation_note: "Proxy derived from RE_MW, capacity factor, outage durations.", uncertainty_note: "Proxy until official reliability KPI is standardized.", is_proxy: true, formula: "f(RE_MW, capacity_factor, outages)", inputs: ["KPI-RE-MW", "capacity_factor", "outages"], targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 0.8, target_year: 2027 }] },
  { id: "KPI-EXPORT", kpi_name: "export_value", category: "Economic", unit: "USD", frequency: "Q", data_source_id: "DS-UBOS", calculation_note: "Total goods exports.", uncertainty_note: "", is_proxy: false, formula: "sum(export_value_usd)", inputs: ["export_value_usd"], targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 10000000000, target_year: 2027 }] },
  { id: "KPI-IRR-HA", kpi_name: "H_solar_irr", category: "FoodSecurity", unit: "hectares", frequency: "S", data_source_id: "DS-UBOS", calculation_note: "Solar irrigation hectares.", uncertainty_note: "", is_proxy: false, formula: "sum(registered_solar_irrigation_hectares)", inputs: ["registered_solar_irrigation_hectares"], targets: [{ strategy_id: "STRAT-ASSP", target_value: 50000, target_year: 2027 }] },
  { id: "KPI-AFOLU-DISP", kpi_name: "AFOLU_tCO2e_avoided", category: "NDC", unit: "tCO2e", frequency: "Q", data_source_id: "DS-MWE-GHG", calculation_note: "Diesel displacement from solar irrigation.", uncertainty_note: "Depends on baseline diesel usage factors.", is_proxy: true, formula: "H_solar_irr * diesel_displacement_factor * emission_factor_diesel", inputs: ["KPI-IRR-HA", "diesel_displacement_factor", "emission_factor_diesel"], targets: [{ strategy_id: "STRAT-NDC", target_value: 150000, target_year: 2027 }] },
  { id: "KPI-ERW-CO2", kpi_name: "CO2_removed_ERW", category: "NDC", unit: "tCO2e", frequency: "A", data_source_id: "DS-MWE-GHG", calculation_note: "CO₂ removal from enhanced rock weathering.", uncertainty_note: "Sequestration factor ranges; field trials required.", is_proxy: true, formula: "ERW_hectares * application_rate * sequestration_factor", inputs: ["ERW_hectares", "application_rate", "sequestration_factor"], targets: [{ strategy_id: "STRAT-NDC", target_value: 50000, target_year: 2027 }] },
  { id: "KPI-NDP-ALIGN", kpi_name: "ndp_program_alignment_pct", category: "ProgrammeDelivery", unit: "pct", frequency: "Q", data_source_id: "DS-NPA", calculation_note: "Share of district projects tagged to an NDP IV programme code.", uncertainty_note: "Improves with tagging completeness.", is_proxy: true, formula: "tagged_projects / total_projects", inputs: ["tagged_projects", "total_projects"], targets: [{ strategy_id: "STRAT-NDPIV", target_value: 0.9, target_year: 2027 }] },
  { id: "KPI-YIELD-IX", kpi_name: "yield_stability_index", category: "FoodSecurity", unit: "index_0_1", frequency: "S", data_source_id: "DS-UBOS", calculation_note: "Stability of yields across weather shocks.", uncertainty_note: "Proxy composed of crop variance and irrigation coverage.", is_proxy: true, formula: "f(variance_yield, irrigation_coverage)", inputs: ["variance_yield", "irrigation_coverage"], targets: [{ strategy_id: "STRAT-ASSP", target_value: 0.75, target_year: 2027 }] },
  { id: "KPI-JOBS", kpi_name: "jobs_created", category: "Economic", unit: "count", frequency: "Q", data_source_id: "DS-UBOS", calculation_note: "Net jobs attributable to programme interventions.", uncertainty_note: "", is_proxy: false, formula: "sum(jobs_est)", inputs: ["jobs_est"], targets: [{ strategy_id: "STRAT-TENFOLD", target_value: 500000, target_year: 2027 }] },
  { id: "KPI-BUDG-COV", kpi_name: "budget_coverage_pct", category: "Budget", unit: "pct", frequency: "Q", data_source_id: "DS-MOFPED", calculation_note: "Share of planned cost covered by budget_code_alignment.", uncertainty_note: "", is_proxy: false, formula: "covered_amount / planned_cost", inputs: ["covered_amount", "planned_cost"], targets: [{ strategy_id: "STRAT-NDPIV", target_value: 0.85, target_year: 2027 }] },
];

export const activities: Activity[] = [
  {
    id: "ACTY-AFOLU-IRR", title: "Scale solar irrigation in smallholder districts", sector: "AFOLU",
    description: "Deploy solar irrigation to boost yields, reduce diesel use, and strengthen food security.",
    strategy_links: [
      { strategy_id: "STRAT-NDC", anchor_or_program_code: "Mitigation-AFOLU" },
      { strategy_id: "STRAT-ASSP", anchor_or_program_code: "FoodSecurity" },
      { strategy_id: "STRAT-NDPIV", anchor_or_program_code: "NDPIV-01" },
      { strategy_id: "STRAT-TENFOLD", anchor_or_program_code: "Agri-Exports" },
    ],
    budget_code_alignment: "AGRI-IRR-2026", investment_readiness_level: "Pipeline",
    ministry_badges: ["MAAIF", "MWE"], district_tags: ["Masindi", "Luwero", "Gulu"],
    kpi_links: ["KPI-IRR-HA", "KPI-AFOLU-DISP", "KPI-YIELD-IX", "KPI-BUDG-COV"],
    data_owner_id: "ACT-EDWARD", validator_id: "ACT-JOAQUIM", decision_owner_id: "ACT-MOFPED-FOCAL",
  },
  {
    id: "ACTY-ENERGY-RE", title: "Ramp utility-scale solar generation", sector: "Energy",
    description: "Add renewable capacity, improve reliability, and lower industrial power costs.",
    strategy_links: [
      { strategy_id: "STRAT-NDC", anchor_or_program_code: "Mitigation-Energy" },
      { strategy_id: "STRAT-TENFOLD", anchor_or_program_code: "Industrial-Competitiveness" },
      { strategy_id: "STRAT-NDPIV", anchor_or_program_code: "NDPIV-03" },
    ],
    budget_code_alignment: "ENERGY-RE-2026", investment_readiness_level: "Emerging",
    ministry_badges: ["MEMD"], district_tags: ["Karamoja", "Soroti"],
    kpi_links: ["KPI-RE-MW", "KPI-RELIAB", "KPI-EXPORT", "KPI-BUDG-COV"],
    data_owner_id: "ACT-UBOS-FOCAL", validator_id: "ACT-JOAQUIM", decision_owner_id: "ACT-MOFPED-FOCAL",
  },
  {
    id: "ACTY-ERW-PILOT", title: "Pilot Enhanced Rock Weathering (ERW) in maize-growing districts", sector: "AFOLU",
    description: "Apply silicate mineral powders to cropland for CO2 removal and soil health.",
    strategy_links: [
      { strategy_id: "STRAT-NDC", anchor_or_program_code: "Mitigation-AFOLU-Removal" },
      { strategy_id: "STRAT-NDPIV", anchor_or_program_code: "NDPIV-02" },
      { strategy_id: "STRAT-ASSP", anchor_or_program_code: "SoilHealth" },
    ],
    budget_code_alignment: "AFOLU-ERW-2026", investment_readiness_level: "NotReady",
    ministry_badges: ["MEMD", "MAAIF"], district_tags: ["Mbale", "Iganga"],
    kpi_links: ["KPI-ERW-CO2", "KPI-YIELD-IX", "KPI-BUDG-COV"],
    data_owner_id: "ACT-EDWARD", validator_id: "ACT-JOAQUIM", decision_owner_id: "ACT-NPA-FOCAL",
  },
];

export const progressRecords: ProgressRecord[] = [
  { id: "PRG-001", kpi_id: "KPI-IRR-HA", period_start: "2026-01-01", period_end: "2026-03-31", value: 8200, validation_status: "Verified", provenance_note: "MAAIF district reports via UBOS API.", last_updated_by: "ACT-EDWARD" },
  { id: "PRG-002", kpi_id: "KPI-AFOLU-DISP", period_start: "2026-01-01", period_end: "2026-03-31", value: 10250, validation_status: "Preliminary", provenance_note: "Calculated with provisional diesel factors; pending MWE verification.", last_updated_by: "ACT-ISAAC" },
  { id: "PRG-003", kpi_id: "KPI-RE-MW", period_start: "2026-01-01", period_end: "2026-03-31", value: 1380, validation_status: "Verified", provenance_note: "UBOS energy registry.", last_updated_by: "ACT-UBOS-FOCAL" },
  { id: "PRG-004", kpi_id: "KPI-RELIAB", period_start: "2026-01-01", period_end: "2026-03-31", value: 0.63, validation_status: "Preliminary", provenance_note: "Proxy from RE_MW, CF=0.23, reported outages.", last_updated_by: "ACT-UBOS-FOCAL" },
];

export const projections: Projection[] = [
  {
    id: "PROJ-BASE-2026-2040", name: "Baseline 2026–2040",
    assumptions_note: "Current policy trajectory; RE growth modest; irrigation expansion limited.",
    start_year: 2026, end_year: 2040,
    drivers: [
      { kpi_id: "KPI-RE-MW", assumption_delta_or_path: "+3% YoY" },
      { kpi_id: "KPI-IRR-HA", assumption_delta_or_path: "+5% YoY" },
    ],
    outputs: [], linked_strategies: ["STRAT-NDC", "STRAT-NDPIV", "STRAT-TENFOLD", "STRAT-V2040"],
  },
  {
    id: "PROJ-NDC100", name: "NDC100 Scenario",
    assumptions_note: "Full achievement of NDC mitigation targets by 2030; accelerated AFOLU & RE.",
    start_year: 2026, end_year: 2040,
    drivers: [
      { kpi_id: "KPI-RE-MW", assumption_delta_or_path: "+8% YoY to 2030, +4% thereafter" },
      { kpi_id: "KPI-IRR-HA", assumption_delta_or_path: "+12% YoY to 2030, +6% thereafter" },
      { kpi_id: "KPI-ERW-CO2", assumption_delta_or_path: "Pilot → Scale from 2028" },
    ],
    outputs: [], linked_strategies: ["STRAT-NDC", "STRAT-NDPIV", "STRAT-TENFOLD", "STRAT-V2040"],
  },
];

export const exportRecords: ExportRecord[] = [
  { id: "EXP-CRT-001", export_type: "CRT_BTR_CSV", filter_params: { strategy: "NDC", validation: "Verified" }, generated_by: "ACT-JOAQUIM", generated_at: "2026-03-24T10:00:00Z", file_link: "" },
];

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
  const startValue = records.length > 0 ? records[records.length - 1].value : 0;
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

export const roadmapPhases = [
  {
    phase: "Phase 1 – Prototype", period: "to May 2026",
    milestones: ["M1 Integrity gating live", "M2 CRT/BTR export mockup validated", "M3 Policy Alignment Layer scaffold", "M4 Ministry badges & focal-point workflow operational"],
  },
  {
    phase: "Phase 2 – AFOLU", period: "Jun–Aug 2026",
    milestones: ["M5 Planet & TRACE data flow stubs wired", "M6 AFOLU proxy metrics (solar irrigation → diesel displacement; ERW → soil C)", "M7 Ministry Ownership Demo (MAAIF/MEMD)"],
  },
  {
    phase: "Phase 3 – Beyond NDC", period: "2026–27",
    milestones: ["M8 Strategy Stack complete", "M9 Projection Mode & investment templates", "M10 Budget alignment checks with MoFPED; NPA dashboard sync"],
  },
  {
    phase: "Phase 4 – Beyond AFOLU", period: "2027+",
    milestones: ["M11 Sector expansion (Energy, Minerals, Industry, Transport, Adaptation)", "M12 National roll-out; portfolio & pipeline view"],
  },
];

export const raciData = {
  responsible: "Line ministries (data production); UNFCCC (architecture & QA/QC); QLIK (product build).",
  accountable: "MoFPED & NPA (national adoption, programme & budget alignment).",
  consulted: "UBOS; Planet; TRACE; Climate Analytics; Climate Policy Radar; ITU.",
  informed: "DFIs, donors, civil society as appropriate.",
};
