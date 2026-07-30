/**
 * The master list of indicators.
 *
 * Every indicator tracked across Uganda's strategies, with how it is verified,
 * how strongly it aligns to each strategy, whether the associated commitment is
 * conditional on outside funding, and which financial instruments suit it.
 */
// Canonical IndicatorRegistry — Uganda NDC Data Explorer (Executive Cockpit)
// Sources: NDP IV (FY2025/26–FY2029/30), Tenfold Growth Strategy (June 2025) to 2040,
// Updated NDC (September 2022) to 2030.
// Design rule: no fabricated values. TBD/unknown → validation_status: "Missing".

import { calculateProgressPercent, calculateProgressStatus } from "@/lib/progress";

export type Strategy = "NDPIV" | "TENFOLD" | "NDC";
export type ValidationStatus = "Verified" | "Provisional" | "Modelled" | "Missing";
export type AlignmentStrength = "Strong" | "Medium" | "Weak";
export type ContributionType = "Direct" | "Proxy" | "Enabling";
export type Conditionality = "Unconditional" | "Conditional" | "Mixed";
export type FinanceInstrument = "grants" | "concessional" | "blended" | "carbon" | "private";
export type ATMS = "A" | "T" | "M" | "S" | null;
export type Trend = "improving" | "worsening" | "flat" | "unknown";

export interface QAFlag {
  rule_id: string;
  severity: "info" | "warn" | "error";
  message: string;
}

export interface Indicator {
  id: string;
  strategy: Strategy;
  sector_or_programme: string;
  objective_or_outcome: string;
  indicator_name: string;
  unit: string;
  baseline_value: number | null;
  baseline_year: string | null;
  target_value_2025: number | null;
  target_value_2030: number | null;
  target_value_2040: number | null;
  target_year_primary: string;
  data_source: string | null;
  data_owner: string | null;
  update_frequency: string | null;
  last_update_date: string | null;
  validation_status: ValidationStatus;
  policy_alignment_tags: string[];
  atms?: ATMS;
  political_salience?: 1 | 2 | 3; // 3 = headline
  current_value?: number | null;
  current_value_year?: string | null;
  trend?: Trend;
  // Finance layer
  conditionality?: Conditionality;
  finance_gap_estimate_usd?: number | null;
  potential_instruments?: FinanceInstrument[];
  qa_flags?: QAFlag[];
}

export interface ContributionMapping {
  indicator_id: string;
  contribution_type: ContributionType;
  contribution_logic: string;
  coefficient?: number;
}

export interface DecisionLogEntry {
  id: string;
  date: string;
  who: string;
  evidence: string;
  what_changed: string;
  next_action: string;
}

export interface ActivityOrProject {
  id: string;
  name: string;
  implementing_entity: string;
  ministry_or_agency: string;
  district: string;
  start_date: string;
  end_date: string;
  status: "Planned" | "Active" | "Delayed" | "Completed" | "Cancelled";
  budget_line_reference?: string;
  outputs: { description: string; quantity?: number; unit?: string }[];
  contribution_mapping: ContributionMapping[];
  evidence_links: string[];
  decision_log: DecisionLogEntry[];
  blockers?: string[];
}

// ---------- COMPUTED HELPERS ----------

export function isTrackable(ind: Indicator): boolean {
  return Boolean(
    ind.unit &&
    ind.baseline_value !== null &&
    (ind.target_value_2025 !== null || ind.target_value_2030 !== null || ind.target_value_2040 !== null) &&
    ind.data_source &&
    ind.last_update_date &&
    ind.validation_status !== "Missing"
  );
}

export function confidenceScore(ind: Indicator): number {
  let s = 0;
  if (ind.unit) s += 10;
  if (ind.baseline_value !== null) s += 15;
  if (ind.baseline_year) s += 5;
  if (ind.target_value_2025 !== null || ind.target_value_2030 !== null || ind.target_value_2040 !== null) s += 20;
  if (ind.data_source) s += 10;
  if (ind.data_owner) s += 5;
  if (ind.last_update_date) s += 10;
  switch (ind.validation_status) {
    case "Verified": s += 25; break;
    case "Provisional": s += 12; break;
    case "Modelled": s += 8; break;
    case "Missing": s += 0; break;
  }
  if (ind.qa_flags?.some(f => f.severity === "error")) s -= 15;
  else if (ind.qa_flags?.some(f => f.severity === "warn")) s -= 5;
  return Math.max(0, Math.min(100, s));
}

export function alignmentStrength(ind: Indicator): AlignmentStrength {
  const n = ind.policy_alignment_tags.length;
  if (n >= 3) return "Strong";
  if (n === 2) return "Medium";
  return "Weak";
}

export function deliveryConfidence(scope: Indicator[]): { pct: number; trackable: number; total: number } {
  if (scope.length === 0) return { pct: 0, trackable: 0, total: 0 };
  const trackable = scope.filter(isTrackable).length;
  return { pct: Math.round((trackable / scope.length) * 100), trackable, total: scope.length };
}

function yearFromLabel(label: string | null | undefined, fallback: number): number {
  const match = String(label ?? "").match(/\d{4}/);
  return match ? parseInt(match[0], 10) : fallback;
}

function indicatorProgressTarget(ind: Indicator) {
  const targetVal = ind.target_value_2030 ?? ind.target_value_2025 ?? ind.target_value_2040;
  return {
    baselineYear: yearFromLabel(ind.baseline_year, 2015),
    baselineValue: ind.baseline_value ?? 0,
    targetYear: yearFromLabel(ind.target_year_primary, 2030),
    targetValue: targetVal ?? 0,
    metricType: "activity-share",
  };
}

function indicatorLatestYear(ind: Indicator): number {
  return yearFromLabel(ind.current_value_year ?? ind.last_update_date, new Date().getFullYear());
}

export function progressPct(ind: Indicator): number | null {
  if (ind.baseline_value === null || ind.current_value === undefined || ind.current_value === null) return null;
  const targetVal = ind.target_value_2030 ?? ind.target_value_2025 ?? ind.target_value_2040;
  if (targetVal === null || targetVal === undefined) return null;
  return calculateProgressPercent(indicatorProgressTarget(ind), {
    latestValue: ind.current_value,
    latestYear: indicatorLatestYear(ind),
  });
}

export function statusColor(
  p: number | null,
  ind?: Indicator,
): "on-track" | "at-risk" | "off-track" | "unknown" {
  if (p === null) return "unknown";
  if (ind) {
    return calculateProgressStatus(p, indicatorProgressTarget(ind), {
      latestYear: indicatorLatestYear(ind),
    });
  }
  return calculateProgressStatus(
    p,
    { baselineYear: 2015, targetYear: 2030 },
    { latestYear: new Date().getFullYear() },
  );
}

// ---------- SHARED DEFAULTS ----------

const NDPIV_DEFAULTS = {
  data_source: "UBOS / NPA Programme M&E",
  data_owner: "National Planning Authority (NPA)",
  update_frequency: "Annual",
  last_update_date: "2025-06-30",
  validation_status: "Verified" as ValidationStatus,
  target_year_primary: "FY2029/30",
  baseline_year: "FY2023/24",
};

const TENFOLD_DEFAULTS = {
  data_source: "Tenfold Growth Strategy (June 2025)",
  data_owner: "Ministry of Finance, Planning & Economic Development",
  update_frequency: "Annual",
  last_update_date: "2025-06-30",
  validation_status: "Provisional" as ValidationStatus,
  target_year_primary: "2040",
  baseline_year: "2023",
};

const NDC_DEFAULTS = {
  data_source: "Uganda Updated NDC (September 2022)",
  data_owner: "Ministry of Water and Environment — Climate Change Department",
  update_frequency: "Biennial (BTR)",
  last_update_date: "2024-12-31",
  validation_status: "Verified" as ValidationStatus,
  target_year_primary: "2030",
  baseline_year: "2015",
};

// Helper builder
const ind = (
  id: string,
  partial: Partial<Indicator> & Pick<Indicator, "indicator_name" | "unit" | "strategy" | "sector_or_programme" | "objective_or_outcome">
): Indicator => {
  const defaults =
    partial.strategy === "NDPIV" ? NDPIV_DEFAULTS :
    partial.strategy === "TENFOLD" ? TENFOLD_DEFAULTS :
    NDC_DEFAULTS;
  return {
    id,
    baseline_value: null,
    target_value_2025: null,
    target_value_2030: null,
    target_value_2040: null,
    policy_alignment_tags: [partial.strategy],
    ...defaults,
    ...partial,
  } as Indicator;
};

// ============================================================
// NDP IV — Goal, Theme, KPIs (baseline FY2023/24 → target FY29/30)
// ============================================================

export const NDPIV_GOAL = "Achieve higher household incomes, full monetisation of the economy, and employment for sustainable socio-economic transformation.";
export const NDPIV_THEME = "Sustainable Industrialisation for Inclusive Growth, Employment, and Wealth Creation.";

const NDPIV_INDICATORS: Indicator[] = [
  // GOAL: Higher household incomes
  ind("NDPIV-INC-01", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Higher household incomes",
    indicator_name: "Real GDP growth rate", unit: "%", baseline_value: 6.1, target_value_2030: 10.1, political_salience: 3, atms: null, policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-INC-02", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Higher household incomes",
    indicator_name: "Income per capita", unit: "USD", baseline_value: 1154, target_value_2030: 2942, political_salience: 3, policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-INC-03", { strategy: "NDPIV", sector_or_programme: "Social", objective_or_outcome: "Higher household incomes",
    indicator_name: "Population below poverty line", unit: "%", baseline_value: 16.9, target_value_2030: 12.9, political_salience: 3 }),
  ind("NDPIV-INC-04", { strategy: "NDPIV", sector_or_programme: "Social", objective_or_outcome: "Higher household incomes",
    indicator_name: "Gini coefficient", unit: "index", baseline_value: 0.413, target_value_2030: 0.37, political_salience: 2 }),
  ind("NDPIV-INC-05", { strategy: "NDPIV", sector_or_programme: "Social", objective_or_outcome: "Higher household incomes",
    indicator_name: "Average monthly nominal household income", unit: "UGX", baseline_value: 190000, target_value_2030: 549703 }),
  ind("NDPIV-INC-06", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Higher household incomes",
    indicator_name: "Adjusted Net Savings", unit: "current UGX bn", baseline_value: 36281, target_value_2030: 52729 }),
  ind("NDPIV-INC-07", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Higher household incomes",
    indicator_name: "Adjusted Net National Income", unit: "current UGX bn", baseline_value: 171802, target_value_2030: 250246 }),

  // GOAL: Employment
  ind("NDPIV-EMP-01", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Employment",
    indicator_name: "Share of working population", unit: "%", baseline_value: 56.7, target_value_2030: 66.5, political_salience: 2 }),
  ind("NDPIV-EMP-02", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Employment",
    indicator_name: "Labourforce participation rate", unit: "%", baseline_value: 43, target_value_2030: 61, political_salience: 3 }),
  ind("NDPIV-EMP-03", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Employment",
    indicator_name: "Share of national labourforce employed less subsistence", unit: "%", baseline_value: 64.1, target_value_2030: 70.9 }),
  ind("NDPIV-EMP-04", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Employment",
    indicator_name: "Employment population ratio", unit: "%", baseline_value: 37.5, target_value_2030: 52.2 }),
  ind("NDPIV-EMP-05", { strategy: "NDPIV", sector_or_programme: "Agro-Industrial", objective_or_outcome: "Employment",
    indicator_name: "Labour productivity (GDP per worker) — Agriculture", unit: "USD", baseline_value: 2586, target_value_2030: 5172, atms: "A", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-EMP-06", { strategy: "NDPIV", sector_or_programme: "Industry", objective_or_outcome: "Employment",
    indicator_name: "Labour productivity (GDP per worker) — Industry", unit: "USD", baseline_value: 28032, target_value_2030: 51536, atms: "M", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-EMP-07", { strategy: "NDPIV", sector_or_programme: "Services", objective_or_outcome: "Employment",
    indicator_name: "Labour productivity (GDP per worker) — Services", unit: "USD", baseline_value: 14257, target_value_2030: 26211, atms: "S", policy_alignment_tags: ["NDPIV","TENFOLD"] }),

  // GOAL: Full monetisation
  ind("NDPIV-MON-01", { strategy: "NDPIV", sector_or_programme: "Social", objective_or_outcome: "Full monetisation",
    indicator_name: "Households in subsistence economy", unit: "%", baseline_value: 33.1, target_value_2030: 21.1, political_salience: 3 }),
  ind("NDPIV-MON-02", { strategy: "NDPIV", sector_or_programme: "ICT", objective_or_outcome: "Full monetisation",
    indicator_name: "Population using mobile banking services", unit: "%", baseline_value: 64, target_value_2030: 100, atms: "S" }),
  ind("NDPIV-MON-03", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Full monetisation",
    indicator_name: "Remittances as share of GDP", unit: "%", baseline_value: 2.6, target_value_2030: 5.6 }),
  ind("NDPIV-MON-04", { strategy: "NDPIV", sector_or_programme: "Financial", objective_or_outcome: "Full monetisation",
    indicator_name: "Financial sector inclusion (formal)", unit: "%", baseline_value: 68, target_value_2030: 86 }),

  // Objective 1: Production / value addition
  ind("NDPIV-O1-01", { strategy: "NDPIV", sector_or_programme: "Agro-Industrial", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Agriculture", unit: "%", baseline_value: 24.7, target_value_2030: 25.5, atms: "A", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O1-02", { strategy: "NDPIV", sector_or_programme: "Tourism", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Tourism", unit: "%", baseline_value: 5.5, target_value_2030: 6.5, atms: "T", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O1-03", { strategy: "NDPIV", sector_or_programme: "ICT", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — ICT", unit: "%", baseline_value: 1.9, target_value_2030: 2.7, atms: "S", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O1-04", { strategy: "NDPIV", sector_or_programme: "Mining", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Mining", unit: "%", baseline_value: 1.3, target_value_2030: 1.6, atms: "M", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O1-05", { strategy: "NDPIV", sector_or_programme: "Oil & Gas", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Oil & Gas", unit: "%", baseline_value: 0, target_value_2030: 5.5, atms: "M", policy_alignment_tags: ["NDPIV","TENFOLD"], political_salience: 3 }),
  ind("NDPIV-O1-06", { strategy: "NDPIV", sector_or_programme: "Services", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Services", unit: "%", baseline_value: 43.1, target_value_2030: 47.9, atms: "S" }),
  ind("NDPIV-O1-07", { strategy: "NDPIV", sector_or_programme: "Industry", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Industry", unit: "%", baseline_value: 24.9, target_value_2030: 27.2, atms: "M" }),
  ind("NDPIV-O1-08", { strategy: "NDPIV", sector_or_programme: "Financial", objective_or_outcome: "Production & value addition",
    indicator_name: "Contribution to GDP — Financial services", unit: "%", baseline_value: 2.8, target_value_2030: 3.5 }),
  ind("NDPIV-O1-09", { strategy: "NDPIV", sector_or_programme: "Trade", objective_or_outcome: "Production & value addition",
    indicator_name: "Merchandise export to GDP ratio", unit: "%", baseline_value: 14.8, target_value_2030: 19.8, policy_alignment_tags: ["NDPIV","TENFOLD"], political_salience: 3 }),

  // Objective 2: Human capital
  ind("NDPIV-O2-01", { strategy: "NDPIV", sector_or_programme: "Education", objective_or_outcome: "Human capital",
    indicator_name: "Literacy rates", unit: "%", baseline_value: 74, target_value_2030: 81 }),
  ind("NDPIV-O2-02", { strategy: "NDPIV", sector_or_programme: "Education", objective_or_outcome: "Human capital",
    indicator_name: "Numeracy rates", unit: "%", baseline_value: 65, target_value_2030: 72 }),
  ind("NDPIV-O2-03", { strategy: "NDPIV", sector_or_programme: "Education", objective_or_outcome: "Human capital",
    indicator_name: "Survival rates — Primary", unit: "%", baseline_value: 34.2, target_value_2030: 55.0 }),
  ind("NDPIV-O2-04", { strategy: "NDPIV", sector_or_programme: "Education", objective_or_outcome: "Human capital",
    indicator_name: "Survival rates — Secondary", unit: "%", baseline_value: 60.0, target_value_2030: 68 }),
  ind("NDPIV-O2-05", { strategy: "NDPIV", sector_or_programme: "Education", objective_or_outcome: "Human capital",
    indicator_name: "Quality adjusted learning years of schooling (QALYS)", unit: "years", baseline_value: 4.5, target_value_2030: 6.0 }),
  ind("NDPIV-O2-06", { strategy: "NDPIV", sector_or_programme: "Education", objective_or_outcome: "Human capital",
    indicator_name: "Employers satisfied with TVET training", unit: "%", baseline_value: 50, target_value_2030: 75 }),
  ind("NDPIV-O2-07", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Maternal mortality rate", unit: "per 100,000", baseline_value: 207, target_value_2030: 80, political_salience: 3 }),
  ind("NDPIV-O2-08", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Infant mortality rate", unit: "per 1,000", baseline_value: 34, target_value_2030: 16 }),
  ind("NDPIV-O2-09", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Under-5 mortality rate", unit: "per 1,000", baseline_value: 46, target_value_2030: 26 }),
  ind("NDPIV-O2-10", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Neo-natal mortality rate", unit: "per 1,000", baseline_value: 22, target_value_2030: 20 }),
  ind("NDPIV-O2-11", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Total fertility rate (total)", unit: "births/woman", baseline_value: 5.2, target_value_2030: 4.0 }),
  ind("NDPIV-O2-12", { strategy: "NDPIV", sector_or_programme: "Demographics", objective_or_outcome: "Human capital",
    indicator_name: "Population growth rate", unit: "%", baseline_value: 2.9, target_value_2030: 2.7 }),
  ind("NDPIV-O2-13", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Life expectancy at birth", unit: "years", baseline_value: 68.2, target_value_2030: 75.9 }),
  ind("NDPIV-O2-14", { strategy: "NDPIV", sector_or_programme: "Water", objective_or_outcome: "Human capital",
    indicator_name: "Access to safe water supply — rural", unit: "%", baseline_value: 67.0, target_value_2030: 80.4, policy_alignment_tags: ["NDPIV","NDC"] }),
  ind("NDPIV-O2-15", { strategy: "NDPIV", sector_or_programme: "Water", objective_or_outcome: "Human capital",
    indicator_name: "Access to safe water supply — urban", unit: "%", baseline_value: 72.8, target_value_2030: 87.4, policy_alignment_tags: ["NDPIV","NDC"] }),
  ind("NDPIV-O2-16", { strategy: "NDPIV", sector_or_programme: "Water", objective_or_outcome: "Human capital",
    indicator_name: "Sanitation coverage", unit: "%", baseline_value: 79.5, target_value_2030: 95.4 }),
  ind("NDPIV-O2-17", { strategy: "NDPIV", sector_or_programme: "Health", objective_or_outcome: "Human capital",
    indicator_name: "Hygiene (handwashing)", unit: "%", baseline_value: 36.0, target_value_2030: 43.2 }),
  ind("NDPIV-O2-18", { strategy: "NDPIV", sector_or_programme: "Agro-Industrial", objective_or_outcome: "Human capital",
    indicator_name: "Population food secure", unit: "%", baseline_value: 60.0, target_value_2030: 84.0, atms: "A", policy_alignment_tags: ["NDPIV","NDC","TENFOLD"], political_salience: 3 }),

  // Objective 3: Private sector & jobs
  ind("NDPIV-O3-01", { strategy: "NDPIV", sector_or_programme: "Trade", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Manufactured exports share of total exports", unit: "%", baseline_value: 24.6, target_value_2030: 31.2, atms: "M", policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O3-02", { strategy: "NDPIV", sector_or_programme: "Trade", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Exports as % of GDP", unit: "%", baseline_value: 12.8, target_value_2030: 19.8, policy_alignment_tags: ["NDPIV","TENFOLD"], political_salience: 3 }),
  ind("NDPIV-O3-03", { strategy: "NDPIV", sector_or_programme: "Financial", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Growth in private sector credit", unit: "%", baseline_value: 7.3, target_value_2030: 29.6 }),
  ind("NDPIV-O3-04", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Tax-to-GDP ratio", unit: "%", baseline_value: 12.9, target_value_2030: 17.8, political_salience: 3 }),
  ind("NDPIV-O3-05", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Savings as % of GDP", unit: "%", baseline_value: 19.3, target_value_2030: 22.89, policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O3-06", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Gross capital formation as % of GDP", unit: "%", baseline_value: 21.5, target_value_2030: 26.64 }),
  ind("NDPIV-O3-07", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Informal sector share", unit: "%", baseline_value: 54.5, target_value_2030: 45.7 }),
  ind("NDPIV-O3-08", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Youth unemployment", unit: "%", baseline_value: 16.1, target_value_2030: 12.9, political_salience: 3 }),
  ind("NDPIV-O3-09", { strategy: "NDPIV", sector_or_programme: "Labour", objective_or_outcome: "Private sector & jobs",
    indicator_name: "Annual jobs created", unit: "count", baseline_value: 39511, target_value_2030: 47413 }),

  // Objective 4: Infrastructure
  ind("NDPIV-O4-01", { strategy: "NDPIV", sector_or_programme: "Transport", objective_or_outcome: "Infrastructure",
    indicator_name: "Travel time within GKMA", unit: "min/km", baseline_value: 3.75, target_value_2030: 3 }),
  ind("NDPIV-O4-02", { strategy: "NDPIV", sector_or_programme: "Transport", objective_or_outcome: "Infrastructure",
    indicator_name: "Freight cargo by rail", unit: "%", baseline_value: 3, target_value_2030: 25, policy_alignment_tags: ["NDPIV","NDC"] }),
  ind("NDPIV-O4-03", { strategy: "NDPIV", sector_or_programme: "Energy", objective_or_outcome: "Infrastructure",
    indicator_name: "Electricity consumption per capita", unit: "kWh", baseline_value: 218, target_value_2030: 578, policy_alignment_tags: ["NDPIV","NDC","TENFOLD"], political_salience: 3 }),
  ind("NDPIV-O4-04", { strategy: "NDPIV", sector_or_programme: "Energy", objective_or_outcome: "Infrastructure",
    indicator_name: "Households with access to electricity", unit: "%", baseline_value: 58, target_value_2030: 100, policy_alignment_tags: ["NDPIV","NDC"], political_salience: 3 }),
  ind("NDPIV-O4-05", { strategy: "NDPIV", sector_or_programme: "Energy", objective_or_outcome: "Infrastructure",
    indicator_name: "Energy generation capacity", unit: "MW", baseline_value: 2047, target_value_2030: 15420, policy_alignment_tags: ["NDPIV","NDC","TENFOLD"], political_salience: 3, atms: "M" }),
  ind("NDPIV-O4-06", { strategy: "NDPIV", sector_or_programme: "ICT", objective_or_outcome: "Infrastructure",
    indicator_name: "Unit cost of internet", unit: "USD", baseline_value: 35, target_value_2030: 25, atms: "S" }),
  ind("NDPIV-O4-07", { strategy: "NDPIV", sector_or_programme: "ICT", objective_or_outcome: "Infrastructure",
    indicator_name: "Internet penetration rate", unit: "%", baseline_value: 67, target_value_2030: 77, atms: "S" }),

  // Objective 5: Governance
  ind("NDPIV-O5-01", { strategy: "NDPIV", sector_or_programme: "Governance", objective_or_outcome: "Governance",
    indicator_name: "Corruption perception index", unit: "index (100 best)", baseline_value: 26, target_value_2030: 31.2, political_salience: 3 }),
  ind("NDPIV-O5-02", { strategy: "NDPIV", sector_or_programme: "Governance", objective_or_outcome: "Governance",
    indicator_name: "Government effectiveness index", unit: "index", baseline_value: -0.55, target_value_2030: 0.66 }),
  ind("NDPIV-O5-03", { strategy: "NDPIV", sector_or_programme: "Macro", objective_or_outcome: "Governance",
    indicator_name: "FDI as % of GDP", unit: "%", baseline_value: 2.8, target_value_2030: 8.6, policy_alignment_tags: ["NDPIV","TENFOLD"] }),
  ind("NDPIV-O5-04", { strategy: "NDPIV", sector_or_programme: "Governance", objective_or_outcome: "Governance",
    indicator_name: "Public satisfaction with service delivery", unit: "%", baseline_value: 60, target_value_2030: 68.3 }),
];

// ============================================================
// TENFOLD GROWTH STRATEGY — Macro targets (to 2040) + ATMS anchors
// ============================================================

export const TENFOLD_HEADLINE = "GDP expansion from ~US$50B (2023) to US$500B (2040).";
export const ATMS_LEGEND = {
  A: "Agro-Industrial Development",
  T: "Tourism Development",
  M: "Mineral-based Development plus Oil & Gas",
  S: "Science, Technology, ICT & Innovation",
};

const TENFOLD_INDICATORS: Indicator[] = [
  ind("TF-01", { strategy: "TENFOLD", sector_or_programme: "Macro", objective_or_outcome: "Tenfold GDP",
    indicator_name: "GDP", unit: "USD", baseline_value: 50_000_000_000, target_value_2040: 500_000_000_000, target_year_primary: "2040", political_salience: 3, policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-02", { strategy: "TENFOLD", sector_or_programme: "Macro", objective_or_outcome: "Per-capita prosperity",
    indicator_name: "Per-capita GDP", unit: "USD", baseline_value: 1081, baseline_year: "FY2022/23", target_value_2040: 7000, target_year_primary: "FY2039/40", political_salience: 3, policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-03", { strategy: "TENFOLD", sector_or_programme: "Macro", objective_or_outcome: "Domestic resource mobilisation",
    indicator_name: "Savings as % of GDP", unit: "%", baseline_value: 20, target_value_2040: 40, policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-04", { strategy: "TENFOLD", sector_or_programme: "Trade", objective_or_outcome: "Export-led growth",
    indicator_name: "Exports in GDP", unit: "%", baseline_value: 12, target_value_2040: 50, political_salience: 3, policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-05", { strategy: "TENFOLD", sector_or_programme: "Industry", objective_or_outcome: "Industrialisation",
    indicator_name: "Manufactured products in merchandise exports", unit: "%", baseline_value: 24.6, target_value_2040: 50, atms: "M", policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-06", { strategy: "TENFOLD", sector_or_programme: "Industry", objective_or_outcome: "Knowledge economy",
    indicator_name: "Medium & high-tech products in manufactured goods", unit: "%", baseline_value: 21, target_value_2040: 50, atms: "S", policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-07", { strategy: "TENFOLD", sector_or_programme: "Macro", objective_or_outcome: "Investment mobilisation",
    indicator_name: "Annual FDI inflows", unit: "USD", baseline_value: 2_900_000_000, target_value_2040: 50_000_000_000, political_salience: 3, policy_alignment_tags: ["TENFOLD","NDPIV"] }),
  ind("TF-08", { strategy: "TENFOLD", sector_or_programme: "Energy", objective_or_outcome: "Energy for industrialisation",
    indicator_name: "Minimum energy generation capacity required", unit: "MW", baseline_value: 2051, baseline_year: "2024", target_value_2040: 20000, atms: "M", policy_alignment_tags: ["TENFOLD","NDPIV","NDC"], political_salience: 3,
    validation_status: "Provisional",
    qa_flags: [{ rule_id: "QA-BASELINE-YEAR", severity: "info", message: "Baseline year approximated from strategy context (2024)." }] }),
];

// ============================================================
// NDC (Updated September 2022) — Mitigation + Adaptation
// ============================================================

const NDC_MITIGATION: Indicator[] = [
  ind("NDC-MIT-HEAD", { strategy: "NDC", sector_or_programme: "Economy-wide", objective_or_outcome: "Mitigation headline",
    indicator_name: "Economy-wide mitigation target", unit: "% below BAU", baseline_value: 0, baseline_year: "BAU", target_value_2030: 24.7, political_salience: 3, conditionality: "Mixed",
    potential_instruments: ["grants","concessional","blended","carbon"], policy_alignment_tags: ["NDC","NDPIV","TENFOLD"] }),
  ind("NDC-MIT-BAU", { strategy: "NDC", sector_or_programme: "Economy-wide", objective_or_outcome: "Mitigation reference",
    indicator_name: "BAU emissions 2030", unit: "MtCO2e", baseline_value: 148.8, target_value_2030: 148.8, political_salience: 2 }),
  ind("NDC-MIT-TGT", { strategy: "NDC", sector_or_programme: "Economy-wide", objective_or_outcome: "Mitigation target",
    indicator_name: "Target emissions 2030", unit: "MtCO2e", baseline_value: 148.8, target_value_2030: 112.1, political_salience: 3 }),
  ind("NDC-MIT-UNC", { strategy: "NDC", sector_or_programme: "Economy-wide", objective_or_outcome: "Unconditional contribution",
    indicator_name: "Unconditional share", unit: "% below BAU", baseline_value: 0, target_value_2030: 5.9, conditionality: "Unconditional", political_salience: 2 }),
  ind("NDC-MIT-COND", { strategy: "NDC", sector_or_programme: "Economy-wide", objective_or_outcome: "Conditional contribution",
    indicator_name: "Conditional additional share", unit: "% below BAU", baseline_value: 0, target_value_2030: 18.8, conditionality: "Conditional",
    potential_instruments: ["grants","concessional","blended","carbon"], political_salience: 3 }),
];

const NDC_ADAPTATION: Indicator[] = [
  // ECOSYSTEMS
  ind("NDC-ECO-01", { strategy: "NDC", sector_or_programme: "Ecosystems", objective_or_outcome: "Wetlands restoration",
    indicator_name: "Wetlands coverage", unit: "%", baseline_value: 8.9, target_value_2025: 9.57, target_value_2030: 12, policy_alignment_tags: ["NDC","NDPIV"] }),
  ind("NDC-ECO-02", { strategy: "NDC", sector_or_programme: "Ecosystems", objective_or_outcome: "Wetlands restoration",
    indicator_name: "Wetlands restored", unit: "ha", baseline_value: 16906, target_value_2025: 55906, target_value_2030: 70000 }),

  // WATER & SANITATION
  ind("NDC-WAT-01", { strategy: "NDC", sector_or_programme: "Water & Sanitation", objective_or_outcome: "Water security",
    indicator_name: "Rural water supply", unit: "%", baseline_value: 68, target_value_2025: 76, target_value_2030: 100, policy_alignment_tags: ["NDC","NDPIV"] }),
  ind("NDC-WAT-02", { strategy: "NDC", sector_or_programme: "Water & Sanitation", objective_or_outcome: "Water security",
    indicator_name: "Urban water supply", unit: "%", baseline_value: 71, target_value_2025: 90, target_value_2030: 100, policy_alignment_tags: ["NDC","NDPIV"] }),
  ind("NDC-WAT-03", { strategy: "NDC", sector_or_programme: "Water & Sanitation", objective_or_outcome: "Sanitation",
    indicator_name: "Basic sanitation access", unit: "%", baseline_value: 18, target_value_2025: 25, target_value_2030: 68 }),
  ind("NDC-WAT-04", { strategy: "NDC", sector_or_programme: "Water & Sanitation", objective_or_outcome: "Resilient water systems",
    indicator_name: "Solar/wind powered water systems constructed", unit: "count", baseline_value: 70, target_value_2025: 320, target_value_2030: 620 }),
  ind("NDC-WAT-05", { strategy: "NDC", sector_or_programme: "Water & Sanitation", objective_or_outcome: "Water quality",
    indicator_name: "Compliance with national water standards", unit: "%", baseline_value: 61, target_value_2025: 70, target_value_2030: 80 }),

  // ENERGY
  ind("NDC-EN-01", { strategy: "NDC", sector_or_programme: "Energy", objective_or_outcome: "Electrification",
    indicator_name: "Electricity access", unit: "%", baseline_value: 24, baseline_year: "2020", target_value_2025: 60, target_value_2030: 75, policy_alignment_tags: ["NDC","NDPIV"], political_salience: 3 }),
  ind("NDC-EN-02", { strategy: "NDC", sector_or_programme: "Energy", objective_or_outcome: "Electrification",
    indicator_name: "Per-capita electricity consumption", unit: "kWh", baseline_value: 100, baseline_year: "2020", target_value_2025: 145, target_value_2030: 578, policy_alignment_tags: ["NDC","NDPIV","TENFOLD"] }),
  ind("NDC-EN-03", { strategy: "NDC", sector_or_programme: "Energy", objective_or_outcome: "Grid expansion",
    indicator_name: "Transmission capacity (high voltage lines)", unit: "km", baseline_value: 2354, baseline_year: "2019", target_value_2025: 4354, target_value_2030: 6300 }),
  ind("NDC-EN-04", { strategy: "NDC", sector_or_programme: "Energy", objective_or_outcome: "Generation",
    indicator_name: "Electricity generation capacity", unit: "MW", baseline_value: 1276.2, target_value_2025: 3500, target_value_2030: 4200, policy_alignment_tags: ["NDC","NDPIV","TENFOLD"] }),
  ind("NDC-EN-05", { strategy: "NDC", sector_or_programme: "Energy", objective_or_outcome: "Clean cooking",
    indicator_name: "Clean cooking share", unit: "%", baseline_value: 15, target_value_2025: 50, target_value_2030: 65, political_salience: 3 }),
  ind("NDC-EN-06", { strategy: "NDC", sector_or_programme: "Energy", objective_or_outcome: "Clean cooking",
    indicator_name: "Biomass share for cooking", unit: "%", baseline_value: 88, target_value_2025: 50, target_value_2030: 40 }),

  // AGRICULTURE
  ind("NDC-AG-01", { strategy: "NDC", sector_or_programme: "Agriculture", objective_or_outcome: "Sustainable land mgmt",
    indicator_name: "Farmers practicing sustainable land management", unit: "%", baseline_value: 31.7, target_value_2025: 51.2, target_value_2030: 70.7, atms: "A", policy_alignment_tags: ["NDC","NDPIV","TENFOLD"] }),
  ind("NDC-AG-02", { strategy: "NDC", sector_or_programme: "Agriculture", objective_or_outcome: "Irrigation expansion",
    indicator_name: "Area under irrigation", unit: "ha", baseline_value: 19776, target_value_2025: 28934, target_value_2030: 152622, atms: "A", policy_alignment_tags: ["NDC","NDPIV"] }),
  ind("NDC-AG-03", { strategy: "NDC", sector_or_programme: "Agriculture", objective_or_outcome: "Food loss reduction",
    indicator_name: "Post-harvest losses", unit: "%", baseline_value: 37, target_value_2025: 12, target_value_2030: 3, atms: "A" }),

  // FISHERIES
  ind("NDC-FISH-01", { strategy: "NDC", sector_or_programme: "Fisheries", objective_or_outcome: "Fish stock recovery",
    indicator_name: "Fish stock volume", unit: "tonnes/yr", baseline_value: 567000, target_value_2025: 1200000, target_value_2030: 1700000 }),

  // FORESTRY
  ind("NDC-FOR-01", { strategy: "NDC", sector_or_programme: "Forestry", objective_or_outcome: "Afforestation",
    indicator_name: "Area under planted forests", unit: "ha", baseline_value: 107608, target_value_2025: 307000, target_value_2030: 407608, policy_alignment_tags: ["NDC","NDPIV"] }),
  ind("NDC-FOR-02", { strategy: "NDC", sector_or_programme: "Forestry", objective_or_outcome: "Forest landscape restoration",
    indicator_name: "Forest landscape restored", unit: "ha", baseline_value: null, target_value_2025: 200000, target_value_2030: 2500000,
    validation_status: "Provisional",
    qa_flags: [{ rule_id: "QA-BASELINE-MISSING", severity: "warn", message: "Baseline not specified in NDC source." }] }),

  // DISASTER RISK REDUCTION
  ind("NDC-DRR-01", { strategy: "NDC", sector_or_programme: "Disaster Risk Reduction", objective_or_outcome: "Local climate planning",
    indicator_name: "Local governments with climate action plans", unit: "%", baseline_value: 0, target_value_2025: 10, target_value_2030: 50 }),
  ind("NDC-DRR-02", { strategy: "NDC", sector_or_programme: "Disaster Risk Reduction", objective_or_outcome: "Early warning",
    indicator_name: "Accuracy of meteorological information", unit: "%", baseline_value: 70, target_value_2025: 90, target_value_2030: null,
    validation_status: "Missing",
    qa_flags: [{ rule_id: "QA-TARGET-MISSING", severity: "warn", message: "2030 target not specified — quantification backlog." }] }),
  ind("NDC-DRR-03", { strategy: "NDC", sector_or_programme: "Disaster Risk Reduction", objective_or_outcome: "Observation network",
    indicator_name: "Automation of weather/climate network", unit: "%", baseline_value: 62, target_value_2025: 82, target_value_2030: null,
    validation_status: "Missing",
    qa_flags: [{ rule_id: "QA-TARGET-MISSING", severity: "warn", message: "2030 target not specified — quantification backlog." }] }),

  // CITIES & BUILT ENVIRONMENT
  ind("NDC-CITY-01", { strategy: "NDC", sector_or_programme: "Cities & Built Environment", objective_or_outcome: "Flood resilience",
    indicator_name: "Drainage channels improved in GKMA", unit: "km", baseline_value: 9, target_value_2025: 30, target_value_2030: 65 }),
  ind("NDC-CITY-02", { strategy: "NDC", sector_or_programme: "Cities & Built Environment", objective_or_outcome: "Solid waste",
    indicator_name: "Solid waste collection efficiency", unit: "%", baseline_value: 33.2, target_value_2025: 50.1, target_value_2030: 70 }),

  // HEALTH
  ind("NDC-HLTH-01", { strategy: "NDC", sector_or_programme: "Health", objective_or_outcome: "Climate-health planning",
    indicator_name: "Climate risk/vulnerability assessments", unit: "count", baseline_value: 0, target_value_2025: 1, target_value_2030: 2 }),
  ind("NDC-HLTH-02", { strategy: "NDC", sector_or_programme: "Health", objective_or_outcome: "District profiling",
    indicator_name: "District climate health profiles", unit: "count", baseline_value: 0, target_value_2025: 10, target_value_2030: 30 }),
  ind("NDC-HLTH-03", { strategy: "NDC", sector_or_programme: "Health", objective_or_outcome: "Resilient infrastructure",
    indicator_name: "Climate smart hospitals", unit: "count", baseline_value: 0, target_value_2025: 2, target_value_2030: 7 }),
  ind("NDC-HLTH-04", { strategy: "NDC", sector_or_programme: "Health", objective_or_outcome: "Emergency systems",
    indicator_name: "Emergency system linkage", unit: "%", baseline_value: 0, target_value_2025: 50, target_value_2030: 100 }),

  // EDUCATION
  ind("NDC-EDU-01", { strategy: "NDC", sector_or_programme: "Education", objective_or_outcome: "Climate literacy",
    indicator_name: "People trained on climate change", unit: "count", baseline_value: 650000, target_value_2025: 4000000, target_value_2030: 11000000 }),
  ind("NDC-EDU-02", { strategy: "NDC", sector_or_programme: "Education", objective_or_outcome: "Indigenous knowledge",
    indicator_name: "Knowledge systems integrating indigenous knowledge", unit: "count", baseline_value: 0, target_value_2025: 2, target_value_2030: 6 }),
];

// ============================================================
// EXPORT
// ============================================================

export const indicatorRegistry: Indicator[] = [
  ...NDPIV_INDICATORS,
  ...TENFOLD_INDICATORS,
  ...NDC_MITIGATION,
  ...NDC_ADAPTATION,
];

export const STRATEGY_LABEL: Record<Strategy, string> = {
  NDPIV: "NDP IV (FY2025/26–FY2029/30)",
  TENFOLD: "Tenfold Growth Strategy (to 2040)",
  NDC: "Updated NDC (to 2030)",
};

// ---- Filtering / scope helpers ----

export interface Scope {
  strategies?: Strategy[];
  atms_only?: boolean;
  verified_only?: boolean;
  sector?: string;
}

export function applyScope(scope: Scope): Indicator[] {
  return indicatorRegistry.filter(i => {
    if (scope.strategies && !scope.strategies.includes(i.strategy)) return false;
    if (scope.atms_only && !i.atms) return false;
    if (scope.verified_only && i.validation_status !== "Verified") return false;
    if (scope.sector && i.sector_or_programme !== scope.sector) return false;
    return true;
  });
}

export function quantificationBacklog(): Indicator[] {
  return indicatorRegistry
    .filter(i => i.validation_status === "Missing" || i.target_value_2030 === null && i.target_value_2025 === null && i.target_value_2040 === null)
    .sort((a, b) => (b.political_salience ?? 1) - (a.political_salience ?? 1));
}

export function whatMustChangeNow(limit = 5): Indicator[] {
  // Rank: salience high & (low confidence OR off-track)
  const scored = indicatorRegistry
    .map(i => {
      const conf = confidenceScore(i);
      const prog = progressPct(i);
      const offTrack = prog !== null && prog < 35;
      const lowConf = conf < 50;
      const salience = i.political_salience ?? 1;
      const score = salience * 10 + (offTrack ? 8 : 0) + (lowConf ? 6 : 0);
      return { i, score, surfaced: offTrack || lowConf || salience >= 3 };
    })
    .filter(x => x.surfaced)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(x => x.i);
}

export function getById(id: string): Indicator | undefined {
  return indicatorRegistry.find(i => i.id === id);
}
