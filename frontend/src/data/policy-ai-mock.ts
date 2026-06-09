// Mock AI policy analysis engine.
// Generates plausible, demo-quality responses for CPR documents using available
// document metadata (title, summary, category, source, type, date).
// No real LLM is called — responses are template-driven with structured content
// referencing plausible page numbers and section headers.

import type { PolicyDocument } from "@/lib/policy-documents";

export type QuickActionType = "exec_summary" | "key_items" | "targets" | "recommendations";

export interface AnalysisSection {
  heading?: string;
  lines: string[];           // each line may contain [p.N] or [§N.N] refs
  page_refs: string[];       // list of page/section refs cited in this block
}

export interface AiAnalysisResponse {
  type: QuickActionType | "chat";
  title: string;
  sections: AnalysisSection[];
  confidence: "high" | "medium" | "low";
  disclaimer: string;
  suggested_follow_ups: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractYear(doc: PolicyDocument): number | null {
  if (!doc.familyDate) return null;
  try { return new Date(doc.familyDate).getFullYear(); } catch { return null; }
}

function firstSentence(text: string): string {
  const s = text.split(/\.\s+/)[0];
  return s.endsWith(".") ? s : `${s}.`;
}

function sourceLabel(doc: PolicyDocument): string {
  const map: Record<string, string> = {
    GCF: "the Green Climate Fund (GCF)",
    GEF: "the Global Environment Facility (GEF)",
    CCLW: "the Climate Change Laws of the World (CCLW) registry",
    UNFCCC: "UNFCCC",
  };
  return doc.source ? (map[doc.source] ?? doc.source) : "the implementing authority";
}

function agencyLabel(doc: PolicyDocument): string {
  if (doc.category === "MCF") return "Ministry of Finance, Planning and Economic Development";
  if (doc.category === "UN Submissions") return "Ministry of Water and Environment";
  if (doc.category === "Legislative") return "Parliament of Uganda";
  return "Ministry of Water and Environment";
}

// ── Executive Summary (strictly 5 lines) ────────────────────────────────────

function generateExecSummary(doc: PolicyDocument): AiAnalysisResponse {
  const year = extractYear(doc) ?? "the planning period";
  const src = sourceLabel(doc);
  const agency = agencyLabel(doc);
  const summary = doc.familySummary ?? "This policy instrument outlines Uganda's climate commitments.";
  const opening = firstSentence(summary);

  const lines = [
    `${opening} [p. 1]`,
    `Issued through ${src}, the document establishes Uganda's legal and institutional mandate for implementation under the Paris Agreement framework [p. 3].`,
    `${agency} holds primary accountability for delivery; a dedicated technical working group convenes quarterly to track progress against milestones [p. 8].`,
    `${doc.category === "MCF"
      ? `Financing is structured as a results-based payment mechanism with co-financing requirements; the ${doc.source ?? "multilateral"} allocation is conditional on verified delivery milestones [p. 14].`
      : "Implementation is co-funded through the national climate change budget and bilateral development partner contributions, with annual expenditure reporting to Parliament [p. 14]."}`,
    `The ${year} plan horizon extends to 2030, with a mandatory mid-term review in ${typeof year === "number" ? year + 2 : "Year 3"} and annual NDC progress updates submitted to UNFCCC [p. 21].`,
  ];

  return {
    type: "exec_summary",
    title: "Executive Summary — 5-Line Brief",
    sections: [{ lines, page_refs: ["p. 1", "p. 3", "p. 8", "p. 14", "p. 21"] }],
    confidence: "high",
    disclaimer: "Generated from document metadata. Verify against the full text before official use.",
    suggested_follow_ups: [
      "What specific emission targets does this set?",
      "Who are the key implementing partners?",
      "What are the funding disbursement milestones?",
    ],
  };
}

// ── Key Items ─────────────────────────────────────────────────────────────────

function generateKeyItems(doc: PolicyDocument): AiAnalysisResponse {
  const agency = agencyLabel(doc);

  return {
    type: "key_items",
    title: "Key Structural Items",
    sections: [
      {
        heading: "Policy Framework & Scope",
        lines: [
          `The document establishes a ${doc.documentType ?? "policy framework"} covering Uganda's obligations under the UNFCCC and Paris Agreement [p. 2].`,
          `Geographic scope: national level with sub-national implementation guidelines for 30 priority districts [§1.3].`,
          doc.familySummary ? firstSentence(doc.familySummary) + " [p. 4]" : "The scope encompasses all major emitting sectors in line with Uganda's NDC [p. 4].",
        ],
        page_refs: ["p. 2", "§1.3", "p. 4"],
      },
      {
        heading: "Institutional Architecture",
        lines: [
          `Primary implementing agency: ${agency}, with coordination across Energy, Agriculture, and Transport ministries [§2.1].`,
          "A National Climate Change Technical Committee (NCCTC) serves as the inter-ministerial coordination body, reporting to Cabinet [p. 9].",
          `An independent MRV unit embedded in NEMA is tasked with data collection, quality assurance, and progress reporting [§2.4].`,
        ],
        page_refs: ["§2.1", "p. 9", "§2.4"],
      },
      {
        heading: "Financing & Accountability",
        lines: [
          doc.category === "MCF"
            ? `Funding source: ${sourceLabel(doc)} — results-based payment, disbursement tied to verified emission reductions or adaptation outcomes [p. 15].`
            : `Budget support channelled through the Uganda Climate Change Fund (UCCF); multi-year expenditure framework aligned with NDP IV [p. 15].`,
          "Annual financial progress reports due to Parliament; independent external audit required every two years [p. 17].",
          "A gender-responsive budget analysis is embedded in all sector allocation decisions [§4.2].",
        ],
        page_refs: ["p. 15", "p. 17", "§4.2"],
      },
      {
        heading: "Monitoring, Reporting & Verification",
        lines: [
          "MRV framework aligned with IPCC 2006 Guidelines and UNFCCC enhanced transparency framework (ETF) [§5.1].",
          "Mandatory biennial progress reports with standardised indicator templates across all implementing ministries [p. 23].",
          "Third-party verification of emission metrics required before international results-based payments are triggered [§5.3].",
        ],
        page_refs: ["§5.1", "p. 23", "§5.3"],
      },
    ],
    confidence: "medium",
    disclaimer: "Key items inferred from document metadata. Section references are illustrative — verify against original document.",
    suggested_follow_ups: [
      "What are the specific climate targets in this document?",
      "Which districts are prioritised for implementation?",
      "What does the MRV process look like in practice?",
    ],
  };
}

// ── Targets ───────────────────────────────────────────────────────────────────

function generateTargets(doc: PolicyDocument): AiAnalysisResponse {
  const year = extractYear(doc) ?? 2030;

  return {
    type: "targets",
    title: "Climate & Policy Targets",
    sections: [
      {
        heading: "Emission Reduction Targets",
        lines: [
          `Unconditional target: 22% reduction in GHG emissions below the Business-As-Usual trajectory by 2030, consistent with Uganda's NDC [p. 6].`,
          `Conditional target: up to 24% reduction contingent on international climate finance of USD 2.9 billion [p. 6].`,
          "AFOLU sector contribution: 57% of total unconditional reduction, predominantly through reducing deforestation and forest degradation [§3.1].",
        ],
        page_refs: ["p. 6", "§3.1"],
      },
      {
        heading: "Sector-Specific Goals",
        lines: [
          "Renewable energy: 41% share of national primary energy mix by 2030 (up from current 9.4% modern renewables) [p. 11].",
          "Transport: 30% penetration of electric two-wheelers in the urban fleet by 2030 as a demand-side measure [§3.4].",
          "Forestry: restore 2.5 million hectares of degraded forest by 2030; zero net deforestation from 2025 onward [p. 13].",
          "Agriculture: 40% of smallholders adopting Climate Smart Agriculture practices by 2030 [§3.6].",
        ],
        page_refs: ["p. 11", "§3.4", "p. 13", "§3.6"],
      },
      {
        heading: `Near-Term Milestones (${typeof year === "number" ? year - 5 : "2025"}–${typeof year === "number" ? year - 2 : "2028"})`,
        lines: [
          `${typeof year === "number" ? year - 3 : "2027"}: Pilot 10 MW off-grid solar installations in 5 northern districts, covering 85,000 households [p. 18].`,
          `${typeof year === "number" ? year - 4 : "2026"}: Launch national mangrove and wetland conservation registry linked to carbon credit mechanism [§4.1].`,
          `${typeof year === "number" ? year - 2 : "2028"}: Operationalise Uganda's national carbon market registry under Article 6.2 bilateral agreement with Switzerland [p. 20].`,
        ],
        page_refs: ["p. 18", "§4.1", "p. 20"],
      },
    ],
    confidence: "medium",
    disclaimer: "Targets are illustrative where document metadata is limited. Cross-reference with Uganda's official NDC and BUR submissions.",
    suggested_follow_ups: [
      "Are these targets conditional or unconditional?",
      "What is the baseline year for these reductions?",
      "How are these targets monitored?",
    ],
  };
}

// ── Recommendations & Actions ─────────────────────────────────────────────────

function generateRecommendations(doc: PolicyDocument): AiAnalysisResponse {
  const agency = agencyLabel(doc);

  return {
    type: "recommendations",
    title: "Recommendations & Actionable Steps",
    sections: [
      {
        heading: "Immediate Actions (0–6 months)",
        lines: [
          `Establish an inter-ministerial coordination mechanism chaired by ${agency} to operationalise implementation [§6.1].`,
          "Finalise data-sharing protocols between NEMA, Uganda Bureau of Statistics, and sector ministries to enable a unified MRV data platform [p. 24].",
          "Procure technical assistance for capacity building in greenhouse gas accounting at district level [§6.2].",
        ],
        page_refs: ["§6.1", "p. 24", "§6.2"],
      },
      {
        heading: "Short-Term Priorities (6–18 months)",
        lines: [
          "Launch competitive grant facility for private-sector REDD+ project developers; target 3 validated projects by end of Year 2 [p. 27].",
          `Integrate climate risk screening into ${doc.category === "MCF" ? "project approval pipeline for GCF/GEF funding" : "public investment management framework"} [§7.1].`,
          "Conduct community-level consultations in 10 target districts; produce free, prior, and informed consent (FPIC) records [p. 29].",
        ],
        page_refs: ["p. 27", "§7.1", "p. 29"],
      },
      {
        heading: "Long-Term Commitments (18 months–2030)",
        lines: [
          "Mainstream NDC metrics into national statistical system (Uganda Bureau of Statistics) for full transparency compliance by 2026 [§8.2].",
          "Develop a National Adaptation Plan (NAP) update aligned with this framework; submit to UNFCCC by 2027 [p. 33].",
          "Scale successful pilot interventions to national programmes; leverage results-based finance to attract private investment at 3:1 co-financing ratio [§8.4].",
        ],
        page_refs: ["§8.2", "p. 33", "§8.4"],
      },
      {
        heading: "Cross-Cutting Coordination",
        lines: [
          "Gender and social inclusion focal points required in each sector working group to ensure equitable benefit distribution [p. 35].",
          "Establish a public grievance mechanism for affected communities, with 30-day response obligations [§9.1].",
        ],
        page_refs: ["p. 35", "§9.1"],
      },
    ],
    confidence: "medium",
    disclaimer: "Recommendations synthesised from document category, type, and available summary. Verify specific actions against the full policy text.",
    suggested_follow_ups: [
      "Who is responsible for each action?",
      "What budget is allocated for these steps?",
      "What happens if milestones are missed?",
    ],
  };
}

// ── "Ask the PDF" chat ────────────────────────────────────────────────────────

const CHAT_FALLBACK_RESPONSES: AiAnalysisSection[] = [
  {
    lines: [
      "Based on the document metadata and category classification, this policy instrument is primarily a framework for climate governance rather than a single-sector technical plan [p. 2].",
      "The document's scope includes both mitigation and adaptation measures, with cross-cutting themes of gender equity and indigenous community rights [§1.4].",
    ],
    page_refs: ["p. 2", "§1.4"],
  },
];

interface ChatQuestion {
  keywords: string[];
  sections: AnalysisSection[];
  follow_ups: string[];
}

function buildChatResponses(doc: PolicyDocument): ChatQuestion[] {
  const year = extractYear(doc) ?? 2030;
  return [
    {
      keywords: ["funding", "finance", "money", "cost", "budget", "usd", "million", "billion"],
      sections: [
        {
          lines: [
            doc.category === "MCF"
              ? `The document describes a ${doc.source ?? "multilateral climate fund"} facility with disbursements structured around verified delivery milestones [p. 14].`
              : "The financial model relies on a blend of national climate budget allocations and international climate finance, including GCF, GEF, and bilateral donors [p. 14].",
            "A fiduciary risk assessment was conducted in Year 0; annual independent audits are required throughout the project cycle [§4.3].",
            "Co-financing requirements: national counterpart funds must cover at least 20% of implementation costs, typically through in-kind contributions from implementing ministries [p. 15].",
          ],
          page_refs: ["p. 14", "§4.3", "p. 15"],
        },
      ],
      follow_ups: ["What are the disbursement conditions?", "What reporting is required to access funds?"],
    },
    {
      keywords: ["target", "goal", "emission", "reduce", "carbon", "co2", "ghg", "percent"],
      sections: [
        {
          lines: [
            "Uganda's primary unconditional emission reduction target is 22% below the BAU trajectory by 2030, with a conditional 24% target subject to international support [p. 6].",
            "This document contributes to the AFOLU sector commitment, which carries 57% of the total mitigation burden through forestry and land-use interventions [§3.1].",
            "Baseline year for all calculations is 2015, consistent with Uganda's First NDC submission [p. 5].",
          ],
          page_refs: ["p. 6", "§3.1", "p. 5"],
        },
      ],
      follow_ups: ["How are these targets monitored?", "What sector has the highest emission reduction potential?"],
    },
    {
      keywords: ["deforestation", "forest", "afolu", "redd", "land", "tree", "logging"],
      sections: [
        {
          lines: [
            "The document addresses forest governance through a REDD+ mechanism aligned with the Warsaw Framework; eligible activities include reduced deforestation, forest degradation, and enhancement of carbon stocks [§3.2].",
            "Uganda's forest cover baseline is 9.5% (3.5 million ha) as of the 2015 national forest inventory; the target is to stabilise cover at 15% by 2030 [p. 12].",
            "A national Forest Reference Level (FRL) was submitted to UNFCCC in 2019 and remains the reference point for REDD+ results-based payments [§3.3].",
          ],
          page_refs: ["§3.2", "p. 12", "§3.3"],
        },
      ],
      follow_ups: ["What enforcement mechanisms protect forests?", "Are communities compensated for forest conservation?"],
    },
    {
      keywords: ["energy", "solar", "renewable", "electricity", "power", "grid"],
      sections: [
        {
          lines: [
            "The energy sector target is 41% renewable share in the primary energy mix by 2030, up from 9.4% modern renewables currently [p. 11].",
            "The document highlights distributed solar (off-grid) as the primary near-term lever, with 260 MW of new solar capacity planned through competitive procurement [§3.5].",
            "Grid expansion plans aim to reach 60% national electrification by 2030, with last-mile mini-grids serving rural areas under the Rural Electrification Agency [p. 11].",
          ],
          page_refs: ["p. 11", "§3.5"],
        },
      ],
      follow_ups: ["What is the private sector role in renewable energy?", "How does electrification link to emission reductions?"],
    },
    {
      keywords: ["when", "timeline", "date", "year", "schedule", "deadline", "period"],
      sections: [
        {
          lines: [
            `This document was issued in ${year} and establishes a planning horizon through 2030, with interim milestones in ${year + 2} (mid-term review) and ${year + 4} (expenditure review) [p. 3].`,
            "Annual implementation progress reports are due to the National Climate Change Technical Committee by 31 March each year [§2.3].",
            "International reporting obligations — Biennial Transparency Report (BTR) — must be submitted to UNFCCC every two years from 2024 onward [p. 22].",
          ],
          page_refs: ["p. 3", "§2.3", "p. 22"],
        },
      ],
      follow_ups: ["What triggers a review or revision of this document?", "When is the next NDC update due?"],
    },
  ];
}

export function askPdf(doc: PolicyDocument, question: string): AiAnalysisResponse {
  const q = question.toLowerCase();
  const chatQuestions = buildChatResponses(doc);
  const match = chatQuestions.find((cq) => cq.keywords.some((kw) => q.includes(kw)));
  const sections = match ? match.sections : CHAT_FALLBACK_RESPONSES;
  const followUps = match ? match.follow_ups : ["What are the main climate targets?", "Who implements this policy?"];

  return {
    type: "chat",
    title: `Response to: "${question}"`,
    sections,
    confidence: match ? "high" : "medium",
    disclaimer: "Responses reference document structure and metadata. Always verify against original text for official use.",
    suggested_follow_ups: followUps,
  };
}

// ── Main dispatch ──────────────────────────────────────────────────────────────

export function generateAnalysis(doc: PolicyDocument, type: QuickActionType): AiAnalysisResponse {
  switch (type) {
    case "exec_summary":    return generateExecSummary(doc);
    case "key_items":       return generateKeyItems(doc);
    case "targets":         return generateTargets(doc);
    case "recommendations": return generateRecommendations(doc);
  }
}

// Re-export type alias for use in components
export type AiAnalysisSection = AnalysisSection;

export const QUICK_ACTIONS: { type: QuickActionType; label: string; description: string; icon: string }[] = [
  { type: "exec_summary",    label: "Executive Summary", description: "5-line high-impact brief",         icon: "FileText" },
  { type: "key_items",       label: "Key Items",         description: "Core structure & focus areas",      icon: "List" },
  { type: "targets",         label: "Targets",           description: "Climate & emission commitments",    icon: "Target" },
  { type: "recommendations", label: "Actions",           description: "Concrete next steps",               icon: "Zap" },
];

export const ANALYSIS_DELAY_MS = 1400;
