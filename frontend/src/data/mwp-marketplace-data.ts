/**
 * MWP Marketplace — Uganda implementation deal room data.
 *
 * Five Uganda pitches mapped to real NDC sectors. Each pitch carries evaluation
 * criteria and delivery milestones so the deal room can show Pitch / Evaluate /
 * Deliver in one view.
 */

/* ── Stages ──────────────────────────────────────────────────────────── */

export const DEAL_STAGES = ["Concept", "Pitched", "Under review", "In delivery"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

const STAGE_TONE: Record<DealStage, string> = {
  Concept:        "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  Pitched:        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "Under review": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "In delivery":  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

export function stageTone(stage: DealStage): string {
  return STAGE_TONE[stage] ?? "bg-muted text-muted-foreground border-border";
}

/* ── Types ───────────────────────────────────────────────────────────── */

export interface ReadinessGap {
  label: string;
  met: boolean;
}

export interface EvalCriterion {
  criterion: string;
  score: "strong" | "adequate" | "weak";
  rationale: string;
}

export interface Evaluation {
  funder: string;
  window: string;
  decision: "interest" | "questions" | "pass";
  criteria: EvalCriterion[];
  summary: string;
}

export interface Milestone {
  label: string;
  status: "done" | "current" | "upcoming";
  date?: string;
}

export interface EvidenceLinks {
  dashboardHref: string;
  policyImpactHref: string;
  climateFinanceHref: string;
}

export interface DealPitch {
  id: string;
  title: string;
  ministry: string;
  sector: string;
  sectorId: string;
  geography: string;
  stage: DealStage;
  problem: string;
  intervention: string;
  askM: number;
  coFinanceM: number;
  instrument: string;
  ndcTarget: string;
  annualMtCO2e: number;
  readiness: ReadinessGap[];
  milestones: Milestone[];
  /** Absent until the pitch is packaged with links back to Explorer evidence. */
  evidence?: EvidenceLinks;
  /** Absent until a funder has reviewed the pitch. */
  evaluation?: Evaluation;
}

/* ── Pitches ─────────────────────────────────────────────────────────── */

export const DEALS: DealPitch[] = [
  {
    id: "uga-afolu",
    title: "Cattle Corridor Agroforestry and Land Restoration",
    ministry: "Ministry of Water and Environment",
    sector: "AFOLU",
    sectorId: "afolu",
    geography: "12 districts across the cattle corridor (Karamoja, Teso, Lango, Ankole)",
    stage: "Under review",
    problem:
      "Deforestation and land degradation across the cattle corridor are driving emissions and collapsing smallholder productivity. Forest cover has fallen to 12.5% of land area against a 2030 target of 21%.",
    intervention:
      "Landscape-scale agroforestry combining farmer-managed natural regeneration, commercial woodlots, and shea-tree restoration across 180,000 hectares — integrated with soil carbon monitoring and community land-use plans.",
    askM: 43,
    coFinanceM: 15,
    instrument: "GCF grant + concessional debt",
    ndcTarget: "Reduce AFOLU emissions by 24.9% below BAU to 91.8 MtCO₂e by 2030; increase forest cover to 21%",
    annualMtCO2e: 0.85,
    readiness: [
      { label: "Costed investment plan", met: true },
      { label: "NDC alignment confirmed", met: true },
      { label: "MRV methodology agreed", met: true },
      { label: "Accredited Entity identified", met: true },
      { label: "E&S safeguards complete", met: false },
      { label: "NDA no-objection letter", met: false },
    ],
    evidence: {
      dashboardHref: "/dashboard?sector=afolu",
      policyImpactHref: "/policy-impact?sector=AFOLU&intervention=reforestation&objective=Cattle+corridor+agroforestry",
      climateFinanceHref: "/climate-finance?sector=afolu&from=policy-impact&intervention=Agroforestry+and+landscape+restoration&scale=1",
    },
    evaluation: {
      funder: "Green Climate Fund",
      window: "GCF Full project (Mitigation / cross-cutting)",
      decision: "interest",
      criteria: [
        { criterion: "NDC alignment", score: "strong", rationale: "Directly targets the AFOLU 24.9% BAU reduction and forest-cover pledge." },
        { criterion: "Climate impact", score: "strong", rationale: "0.85 MtCO₂e/yr with established FMNR methodology; strong co-benefits for soil carbon." },
        { criterion: "Financial viability", score: "adequate", rationale: "Grant-dependent; carbon revenue could cover 30% of operating costs but PPA not yet signed." },
        { criterion: "Institutional capacity", score: "adequate", rationale: "MoWE has GCF track record; district coordination capacity is the bottleneck." },
        { criterion: "Safeguards & FPIC", score: "weak", rationale: "E&S screening started but FPIC process with pastoralist communities not complete." },
        { criterion: "MRV readiness", score: "strong", rationale: "Satellite + ground-truth sampling design agreed with Climate TRACE team." },
      ],
      summary: "Strong alignment and climate impact. GCF is prepared to move to concept note stage once safeguards and NDA no-objection are in place.",
    },
    milestones: [
      { label: "NDA no-objection letter", status: "current", date: "Q3 2026" },
      { label: "Concept note submitted", status: "upcoming", date: "Q4 2026" },
      { label: "GCF Secretariat review", status: "upcoming", date: "Q1 2027" },
      { label: "Full proposal + safeguards", status: "upcoming", date: "Q3 2027" },
      { label: "Board approval", status: "upcoming", date: "Q4 2027" },
      { label: "First disbursement", status: "upcoming", date: "Q1 2028" },
      { label: "MRV baseline report", status: "upcoming", date: "Q2 2028" },
    ],
  },
  {
    id: "uga-energy",
    title: "Clean Cooking and Off-Grid Solar for Rural Uganda",
    ministry: "Ministry of Energy and Mineral Development",
    sector: "Energy",
    sectorId: "energy",
    geography: "West Nile and Karamoja sub-regions; national cookstove programme",
    stage: "Pitched",
    problem:
      "Only 24% of Ugandans have access to electricity. 85% of households rely on biomass for cooking, driving deforestation and indoor air pollution. The NDC targets 65% clean cooking and 75% electricity access by 2030.",
    intervention:
      "Deploy 40 solar mini-grids in off-grid sub-counties and distribute 200,000 improved cookstoves per year through a results-based financing model with private sector last-mile distributors.",
    askM: 18,
    coFinanceM: 10,
    instrument: "GCF SAP grant + results-based finance",
    ndcTarget: "Increase clean cooking to 65% and electricity access to 75% by 2030; limit energy emissions to 10.10 MtCO₂e",
    annualMtCO2e: 0.45,
    readiness: [
      { label: "Costed investment plan", met: true },
      { label: "NDC alignment confirmed", met: true },
      { label: "MRV methodology agreed", met: false },
      { label: "Accredited Entity identified", met: true },
      { label: "E&S safeguards complete", met: true },
      { label: "NDA no-objection letter", met: true },
    ],
    evidence: {
      dashboardHref: "/dashboard?sector=energy",
      policyImpactHref: "/policy-impact?sector=Energy&intervention=renewable_energy_investment&objective=Off-grid+solar+and+clean+cooking",
      climateFinanceHref: "/climate-finance?sector=energy&from=policy-impact&intervention=Solar+mini-grids+and+cookstoves&scale=1",
    },
    evaluation: {
      funder: "Green Climate Fund",
      window: "GCF Simplified Approval Process (SAP)",
      decision: "questions",
      criteria: [
        { criterion: "NDC alignment", score: "strong", rationale: "Directly serves the clean cooking 65% and electricity access 75% targets." },
        { criterion: "Climate impact", score: "adequate", rationale: "0.45 MtCO₂e/yr; cookstove baseline methodology needs refinement for GCF standards." },
        { criterion: "Financial viability", score: "strong", rationale: "RBF model proven in East Africa; private sector co-finance committed." },
        { criterion: "Institutional capacity", score: "adequate", rationale: "MEMD has experience but needs dedicated PMU for mini-grid component." },
        { criterion: "Safeguards & FPIC", score: "strong", rationale: "Category B — community engagement complete for pilot sites." },
        { criterion: "MRV readiness", score: "weak", rationale: "Cookstove monitoring methodology not yet agreed; needs Gold Standard or CDM alignment." },
      ],
      summary: "GCF SAP team has requested clarification on cookstove MRV methodology and the baseline emissions calculation before advancing to funding proposal.",
    },
    milestones: [
      { label: "NDA no-objection letter", status: "done", date: "Q1 2026" },
      { label: "Concept note submitted", status: "done", date: "Q2 2026" },
      { label: "GCF SAP review", status: "current", date: "Q3 2026" },
      { label: "Funding proposal submission", status: "upcoming", date: "Q4 2026" },
      { label: "Board approval", status: "upcoming", date: "Q1 2027" },
      { label: "First disbursement", status: "upcoming", date: "Q2 2027" },
    ],
  },
  {
    id: "uga-transport",
    title: "Greater Kampala Electric Bus Rapid Transit",
    ministry: "Ministry of Works and Transport",
    sector: "Transport",
    sectorId: "transport",
    geography: "Greater Kampala Metropolitan Area (GKMA) — Kampala, Wakiso, Mukono, Mpigi",
    stage: "Concept",
    problem:
      "Transport emissions are growing at 8% per year. The GKMA has no mass transit system — 14,000 ageing diesel matatus carry 70% of passengers with severe congestion and air quality impacts. The NDC targets 200 e-buses and 101 km of BRT by 2030.",
    intervention:
      "Procure 200 electric buses for three GKMA corridors (Kampala–Entebbe, Kampala–Mukono, Northern Bypass), build depot charging infrastructure, and restructure route concessions to support the transition.",
    askM: 85,
    coFinanceM: 35,
    instrument: "World Bank IDA credit + GCF co-finance",
    ndcTarget: "Limit transport emissions to 6.8 MtCO₂e by 2030 (29% below BAU); 200 e-buses and 101 km BRT in GKMA",
    annualMtCO2e: 0.6,
    readiness: [
      { label: "Costed investment plan", met: false },
      { label: "NDC alignment confirmed", met: true },
      { label: "MRV methodology agreed", met: false },
      { label: "Accredited Entity identified", met: false },
      { label: "E&S safeguards complete", met: false },
      { label: "NDA no-objection letter", met: false },
    ],
    evidence: {
      dashboardHref: "/dashboard?sector=transport",
      policyImpactHref: "/policy-impact?sector=Transport&intervention=ev_transition&objective=Greater+Kampala+e-bus+BRT",
      climateFinanceHref: "/climate-finance?sector=transport&from=policy-impact&intervention=Electric+bus+rapid+transit&scale=1",
    },
    evaluation: {
      funder: "World Bank",
      window: "World Bank IDA / development policy",
      decision: "pass",
      criteria: [
        { criterion: "NDC alignment", score: "strong", rationale: "Directly implements the NDC's 200 e-bus and BRT commitments." },
        { criterion: "Climate impact", score: "adequate", rationale: "0.6 MtCO₂e/yr projected but methodology not yet validated; grid emission factor matters." },
        { criterion: "Financial viability", score: "weak", rationale: "No costed investment plan yet; fare revenue model and bus procurement strategy undefined." },
        { criterion: "Institutional capacity", score: "weak", rationale: "No transit authority exists; MoWT has not managed a fleet procurement of this scale." },
        { criterion: "Safeguards & FPIC", score: "weak", rationale: "Route alignments not determined; resettlement risk unknown." },
        { criterion: "MRV readiness", score: "weak", rationale: "No transport emissions monitoring baseline in place." },
      ],
      summary: "Strong NDC alignment, but this pitch needs a feasibility study, institutional framework, and costed investment plan before a funder can engage.",
    },
    milestones: [
      { label: "Feasibility study commissioned", status: "current", date: "Q4 2026" },
      { label: "Transit authority established", status: "upcoming", date: "Q2 2027" },
      { label: "Costed investment plan", status: "upcoming", date: "Q3 2027" },
      { label: "IDA project concept note", status: "upcoming", date: "Q1 2028" },
      { label: "Appraisal and board approval", status: "upcoming", date: "Q3 2028" },
      { label: "Bus procurement begins", status: "upcoming", date: "Q1 2029" },
      { label: "First corridor operational", status: "upcoming", date: "Q4 2029" },
    ],
  },
  {
    id: "uga-waste",
    title: "Green Cities Waste Management Programme",
    ministry: "Ministry of Local Government",
    sector: "Waste",
    sectorId: "waste",
    geography: "Kampala, Gulu, Mbarara, Hoima, Mbale — 5 cities + 15 municipalities",
    stage: "In delivery",
    problem:
      "Urban waste volumes are growing 5% annually. Less than 40% of solid waste is collected in secondary cities. Open dumping produces methane and contaminates water sources. The NDC targets a 34.8% waste emission reduction by 2030.",
    intervention:
      "Construct engineered landfills with gas capture in 5 cities, establish source-separation and composting in 15 municipalities, and install wastewater treatment in Kampala and Mbarara.",
    askM: 22,
    coFinanceM: 8,
    instrument: "GEF Climate Change focal area + government co-finance",
    ndcTarget: "Limit waste emissions to 2.09 MtCO₂e by 2030 (34.8% below BAU of 3.19 MtCO₂e)",
    annualMtCO2e: 0.35,
    readiness: [
      { label: "Costed investment plan", met: true },
      { label: "NDC alignment confirmed", met: true },
      { label: "MRV methodology agreed", met: true },
      { label: "Accredited Entity identified", met: true },
      { label: "E&S safeguards complete", met: true },
      { label: "NDA no-objection letter", met: true },
    ],
    evidence: {
      dashboardHref: "/dashboard?sector=waste",
      policyImpactHref: "/policy-impact?sector=Waste&intervention=efficiency_programme&objective=Green+cities+waste+management",
      climateFinanceHref: "/climate-finance?sector=waste&from=policy-impact&intervention=Urban+waste+management&scale=1",
    },
    evaluation: {
      funder: "Global Environment Facility",
      window: "GEF Climate Change focal area",
      decision: "interest",
      criteria: [
        { criterion: "NDC alignment", score: "strong", rationale: "Directly implements the waste sector NDC target across all five named cities." },
        { criterion: "Climate impact", score: "adequate", rationale: "0.35 MtCO₂e/yr from landfill gas and composting; conservative estimate." },
        { criterion: "Financial viability", score: "strong", rationale: "Municipal revenue from tipping fees; composting generates saleable product." },
        { criterion: "Institutional capacity", score: "strong", rationale: "UNDP is executing agency; municipal waste authorities operational in 3 of 5 cities." },
        { criterion: "Safeguards & FPIC", score: "strong", rationale: "ESIA completed for all five landfill sites; community consultations documented." },
        { criterion: "MRV readiness", score: "adequate", rationale: "Methane capture monitored; composting volumes tracked but emission factors need validation." },
      ],
      summary: "GEF CEO endorsement granted. UNDP executing agency has begun procurement. First landfill gas capture system under construction in Kampala.",
    },
    milestones: [
      { label: "NDA no-objection letter", status: "done", date: "Q2 2025" },
      { label: "Concept note submitted", status: "done", date: "Q3 2025" },
      { label: "GEF CEO endorsement", status: "done", date: "Q1 2026" },
      { label: "First disbursement", status: "done", date: "Q2 2026" },
      { label: "Kampala landfill gas capture", status: "current", date: "Q4 2026" },
      { label: "Source separation in 15 municipalities", status: "upcoming", date: "Q2 2027" },
      { label: "MRV baseline report", status: "upcoming", date: "Q4 2027" },
    ],
  },
  {
    id: "uga-ippu",
    title: "Cement Sector Clinker Substitution Programme",
    ministry: "Ministry of Trade, Industry and Cooperatives",
    sector: "IPPU",
    sectorId: "ippu",
    geography: "National — Hima, Tororo, and Kampala cement plants",
    stage: "Pitched",
    problem:
      "Cement production is the largest industrial emission source. Clinker production accounts for 90% of IPPU emissions. The NDC targets a 14% reduction through clinker substitution but no programme exists to coordinate it.",
    intervention:
      "Technical assistance and capital subsidy for three cement producers to increase pozzolana, fly-ash, and slag blending ratios from 15% to 35%, supported by quality standards revision and market development for blended cements.",
    askM: 6,
    coFinanceM: 4,
    instrument: "Bilateral TA + carbon market pre-purchase",
    ndcTarget: "Limit IPPU emissions to 0.86 MtCO₂e by 2030 (14% below BAU of 1.0 MtCO₂e)",
    annualMtCO2e: 0.12,
    readiness: [
      { label: "Costed investment plan", met: true },
      { label: "NDC alignment confirmed", met: true },
      { label: "MRV methodology agreed", met: true },
      { label: "Accredited Entity identified", met: false },
      { label: "E&S safeguards complete", met: true },
      { label: "NDA no-objection letter", met: false },
    ],
    evidence: {
      dashboardHref: "/dashboard?sector=ippu",
      policyImpactHref: "/policy-impact?sector=IPPU&intervention=efficiency_programme&objective=Clinker+substitution",
      climateFinanceHref: "/climate-finance?sector=ippu&from=policy-impact&intervention=Clinker+substitution&scale=1",
    },
    evaluation: {
      funder: "Germany (GIZ)",
      window: "Bilateral technical assistance",
      decision: "questions",
      criteria: [
        { criterion: "NDC alignment", score: "strong", rationale: "The only programme targeting IPPU, which is explicitly named in the Updated NDC." },
        { criterion: "Climate impact", score: "adequate", rationale: "0.12 MtCO₂e/yr — small in absolute terms but covers 86% of the IPPU target." },
        { criterion: "Financial viability", score: "strong", rationale: "Blended cement is cheaper to produce; carbon pre-purchase provides additional revenue." },
        { criterion: "Institutional capacity", score: "adequate", rationale: "MTIC oversees standards but has limited climate project management experience." },
        { criterion: "Safeguards & FPIC", score: "strong", rationale: "No resettlement or community impacts; industrial process change only." },
        { criterion: "MRV readiness", score: "strong", rationale: "Clinker ratio is directly measurable from plant production records." },
      ],
      summary: "GIZ is interested in a bilateral TA package. Waiting for MTIC to confirm counterpart staffing and for UNBS to agree the revised blended cement standard.",
    },
    milestones: [
      { label: "Technical assessment complete", status: "done", date: "Q1 2026" },
      { label: "Standards revision submitted to UNBS", status: "current", date: "Q3 2026" },
      { label: "GIZ bilateral agreement", status: "upcoming", date: "Q4 2026" },
      { label: "Plant-level blending upgrades", status: "upcoming", date: "Q2 2027" },
      { label: "First carbon credit issuance", status: "upcoming", date: "Q4 2027" },
      { label: "MRV verification report", status: "upcoming", date: "Q1 2028" },
    ],
  },
];

/* ── Helpers ──────────────────────────────────────────────────────────── */

export function getDeal(id: string): DealPitch | undefined {
  return DEALS.find((d) => d.id === id);
}

export function fmtUSD(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  if (m >= 1) return `$${m.toFixed(0)}M`;
  return `$${(m * 1000).toFixed(0)}K`;
}
