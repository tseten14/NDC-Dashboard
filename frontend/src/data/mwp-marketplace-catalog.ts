/**
 * MWP Implementation Marketplace — demonstration data.
 *
 * All figures are fictional, authored for a click-dummy prototype.
 * Not official UNFCCC assessments or investment advice.
 */

/* ── Taxonomies ──────────────────────────────────────────────────────── */

export const PROJECT_STAGES = [
  "Initial concept",
  "Pre-feasibility",
  "Feasibility",
  "Financial structuring",
  "Due diligence",
  "IC review",
  "FID reached",
  "Implementation",
  "Operational",
] as const;

export type ProjectStage = (typeof PROJECT_STAGES)[number];

export const SECTORS = [
  "AFOLU",
  "Clean transport",
  "Cross-sectoral",
  "Energy efficiency",
  "Green hydrogen",
  "Industrial decarbonisation",
  "Methane reduction",
  "Renewable energy",
  "Waste and circular economy",
] as const;

export type Sector = (typeof SECTORS)[number];

/* ── Stage styling ───────────────────────────────────────────────────── */

const STAGE_TONE: Record<string, string> = {
  "Initial concept":      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  "Pre-feasibility":      "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
  "Feasibility":          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "Financial structuring": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "Due diligence":        "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  "IC review":            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "FID reached":          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "Implementation":       "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
  "Operational":          "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
};

export function stageTone(stage: string): string {
  return STAGE_TONE[stage] ?? "bg-muted text-muted-foreground border-border";
}

/* ── Project type ────────────────────────────────────────────────────── */

export interface MwpProject {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  sector: Sector;
  stage: ProjectStage;
  totalInvestmentM: number;
  securedM: number;
  gapM: number;
  annualMtCO2e: number;
  ndcTarget: string;
  summary: string;
  flagship: boolean;
}

/* ── Projects ────────────────────────────────────────────────────────── */

export const PROJECTS: MwpProject[] = [
  {
    id: "P-UGA-001",
    name: "Uganda Climate-Smart Agroforestry and Land Restoration Programme",
    country: "Uganda",
    countryCode: "UGA",
    region: "Sub-Saharan Africa",
    sector: "AFOLU",
    stage: "Financial structuring",
    totalInvestmentM: 58,
    securedM: 14.5,
    gapM: 43.5,
    annualMtCO2e: 0.85,
    ndcTarget: "Reduce agricultural and land-use emissions through climate-smart agroforestry",
    summary: "Landscape-scale agroforestry and land restoration across 12 districts in the cattle corridor, combining carbon sequestration with livelihood improvements for smallholder farmers.",
    flagship: true,
  },
  {
    id: "P-KEN-001",
    name: "Kenya Industrial Heat Electrification Facility",
    country: "Kenya",
    countryCode: "KEN",
    region: "Sub-Saharan Africa",
    sector: "Industrial decarbonisation",
    stage: "Due diligence",
    totalInvestmentM: 74,
    securedM: 31,
    gapM: 43,
    annualMtCO2e: 1.05,
    ndcTarget: "Electrify industrial process heat away from fossil fuels",
    summary: "Transition industrial facilities to electric process heat, targeting cement, tea and agro-processing sectors across five counties.",
    flagship: true,
  },
  {
    id: "P-BGD-001",
    name: "Bangladesh Energy-Efficient Garment Manufacturing Programme",
    country: "Bangladesh",
    countryCode: "BGD",
    region: "South Asia",
    sector: "Energy efficiency",
    stage: "Feasibility",
    totalInvestmentM: 39,
    securedM: 6,
    gapM: 33,
    annualMtCO2e: 0.62,
    ndcTarget: "Improve energy efficiency across garment manufacturing",
    summary: "Facility-level energy audits and efficiency upgrades across 200+ garment factories, reducing energy costs and emissions while improving export competitiveness.",
    flagship: true,
  },
  {
    id: "P-SEN-001",
    name: "Senegal Solar Irrigation and Cold-Chain Programme",
    country: "Senegal",
    countryCode: "SEN",
    region: "Sub-Saharan Africa",
    sector: "AFOLU",
    stage: "Pre-feasibility",
    totalInvestmentM: 26,
    securedM: 3,
    gapM: 23,
    annualMtCO2e: 0.31,
    ndcTarget: "Expand solar irrigation and reduce diesel dependence",
    summary: "Solar-powered irrigation systems and cold-chain infrastructure for smallholder farmers in the Senegal River Valley.",
    flagship: false,
  },
  {
    id: "P-GHA-001",
    name: "Ghana Electric Public Transport Transition",
    country: "Ghana",
    countryCode: "GHA",
    region: "Sub-Saharan Africa",
    sector: "Clean transport",
    stage: "Initial concept",
    totalInvestmentM: 61,
    securedM: 2,
    gapM: 59,
    annualMtCO2e: 0.44,
    ndcTarget: "Transition urban public transport to low-emission and electric fleets",
    summary: "Replace ageing diesel bus fleets in Accra and Kumasi with electric vehicles, supported by charging infrastructure and route optimisation.",
    flagship: false,
  },
  {
    id: "P-ZAF-001",
    name: "South Africa Green Industrial Cluster",
    country: "South Africa",
    countryCode: "ZAF",
    region: "Sub-Saharan Africa",
    sector: "Industrial decarbonisation",
    stage: "IC review",
    totalInvestmentM: 210,
    securedM: 95,
    gapM: 115,
    annualMtCO2e: 1.9,
    ndcTarget: "Establish green industrial clusters aligned with just energy transition",
    summary: "Green industrial zones in Mpumalanga and Limpopo with renewable power, green hydrogen production and workforce retraining.",
    flagship: false,
  },
  {
    id: "P-MAR-001",
    name: "Morocco Renewable Hydrogen Industrial Demonstrator",
    country: "Morocco",
    countryCode: "MAR",
    region: "Middle East & North Africa",
    sector: "Green hydrogen",
    stage: "Feasibility",
    totalInvestmentM: 130,
    securedM: 22,
    gapM: 108,
    annualMtCO2e: 0.58,
    ndcTarget: "Scale renewable hydrogen for industrial decarbonisation and export",
    summary: "Green hydrogen pilot plant near Nador, producing ammonia for domestic fertiliser production and export markets.",
    flagship: false,
  },
  {
    id: "P-IDN-001",
    name: "Indonesia Coal-Region Just Transition Investment Programme",
    country: "Indonesia",
    countryCode: "IDN",
    region: "East Asia & Pacific",
    sector: "Cross-sectoral",
    stage: "FID reached",
    totalInvestmentM: 340,
    securedM: 340,
    gapM: 0,
    annualMtCO2e: 2.4,
    ndcTarget: "Manage a just transition away from coal in coal-dependent regions",
    summary: "Multi-sector investment programme supporting coal-region economic diversification in South and East Kalimantan.",
    flagship: false,
  },
  {
    id: "P-VNM-001",
    name: "Viet Nam Commercial and Industrial Energy-Efficiency Facility",
    country: "Viet Nam",
    countryCode: "VNM",
    region: "East Asia & Pacific",
    sector: "Energy efficiency",
    stage: "Financial structuring",
    totalInvestmentM: 48,
    securedM: 11,
    gapM: 37,
    annualMtCO2e: 0.5,
    ndcTarget: "Improve commercial and industrial energy efficiency",
    summary: "Dedicated credit line and technical assistance for energy-efficiency investments in commercial buildings and light industry.",
    flagship: false,
  },
  {
    id: "P-COL-001",
    name: "Colombia Agricultural Methane Reduction Programme",
    country: "Colombia",
    countryCode: "COL",
    region: "Latin America & Caribbean",
    sector: "Methane reduction",
    stage: "Pre-feasibility",
    totalInvestmentM: 34,
    securedM: 4,
    gapM: 30,
    annualMtCO2e: 0.72,
    ndcTarget: "Reduce methane emissions from livestock and agriculture",
    summary: "Livestock feed additives and biodigesters for dairy and beef operations in the Llanos and Andean regions.",
    flagship: false,
  },
  {
    id: "P-FJI-001",
    name: "Fiji Resilient Renewable Mini-Grids Facility",
    country: "Fiji",
    countryCode: "FJI",
    region: "Pacific",
    sector: "Renewable energy",
    stage: "Initial concept",
    totalInvestmentM: 19,
    securedM: 2.5,
    gapM: 16.5,
    annualMtCO2e: 0.09,
    ndcTarget: "Deploy resilient renewable mini-grids on outer islands",
    summary: "Solar-battery mini-grids replacing diesel generation on 15 outer islands, with cyclone-resilient design.",
    flagship: false,
  },
  {
    id: "P-RWA-001",
    name: "Rwanda Circular Cities and Organic Waste Programme",
    country: "Rwanda",
    countryCode: "RWA",
    region: "Sub-Saharan Africa",
    sector: "Waste and circular economy",
    stage: "Pre-feasibility",
    totalInvestmentM: 15,
    securedM: 1.5,
    gapM: 13.5,
    annualMtCO2e: 0.16,
    ndcTarget: "Build circular waste management in secondary cities",
    summary: "Organic waste collection and composting infrastructure in Huye, Musanze and Rubavu, reducing landfill methane.",
    flagship: false,
  },
];

/* ── Aggregate stats ─────────────────────────────────────────────────── */

export function computeStats(projects: MwpProject[]) {
  const totalInvestment = projects.reduce((s, p) => s + p.totalInvestmentM, 0);
  const totalSecured = projects.reduce((s, p) => s + p.securedM, 0);
  const totalGap = projects.reduce((s, p) => s + p.gapM, 0);
  const totalMtCO2e = projects.reduce((s, p) => s + p.annualMtCO2e, 0);
  const countries = new Set(projects.map((p) => p.countryCode)).size;
  const sectors = new Set(projects.map((p) => p.sector)).size;
  return { totalInvestment, totalSecured, totalGap, totalMtCO2e, countries, sectors, count: projects.length };
}

/* ── Format helpers ──────────────────────────────────────────────────── */

export function fmtUSD(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  if (m >= 1) return `$${m.toFixed(0)}M`;
  return `$${(m * 1000).toFixed(0)}K`;
}
