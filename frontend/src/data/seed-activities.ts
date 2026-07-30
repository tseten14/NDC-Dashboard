/**
 * Example activities.
 *
 * A handful of realistic sample activities so the delivery screens have
 * something to show before any real data has been entered.
 */
// Seed ActivityOrProject records — minimal but real enough to drive activity workflows.
import type { ActivityOrProject } from "./indicator-registry";

export const seedActivities: ActivityOrProject[] = [
  {
    id: "ACT-IRR-001",
    name: "Solar irrigation scale-up — smallholder corridor",
    implementing_entity: "Ministry of Agriculture, Animal Industry & Fisheries (MAAIF)",
    ministry_or_agency: "MAAIF",
    district: "Masindi",
    start_date: "2025-07-01",
    end_date: "2027-06-30",
    status: "Active",
    budget_line_reference: "AGRI-IRR-2026",
    outputs: [
      { description: "Solar irrigation hectares commissioned", quantity: 8200, unit: "ha" },
      { description: "Smallholders enrolled", quantity: 4200, unit: "households" },
    ],
    contribution_mapping: [
      { indicator_id: "NDC-AG-02", contribution_type: "Direct", contribution_logic: "Adds to area under irrigation." },
      { indicator_id: "NDPIV-O2-18", contribution_type: "Proxy", contribution_logic: "Improves food security via yield stability.", coefficient: 0.3 },
      { indicator_id: "NDC-MIT-HEAD", contribution_type: "Enabling", contribution_logic: "Diesel displacement contributes to AFOLU mitigation." },
    ],
    evidence_links: ["MAAIF Q1 2026 district report", "UBOS irrigation registry"],
    decision_log: [
      { id: "DL-001", date: "2026-02-12", who: "MAAIF + MoFPED", evidence: "Q4 disbursement variance", what_changed: "Re-phased disbursement", next_action: "Resume by Q2 2026" },
    ],
    blockers: ["Concessional finance not yet confirmed for second tranche"],
  },
  {
    id: "ACT-RE-002",
    name: "Utility-scale solar — Karamoja & Soroti",
    implementing_entity: "Ministry of Energy & Mineral Development (MEMD)",
    ministry_or_agency: "MEMD",
    district: "Karamoja",
    start_date: "2025-10-01",
    end_date: "2028-12-31",
    status: "Planned",
    budget_line_reference: "ENERGY-RE-2026",
    outputs: [{ description: "MW commissioned", quantity: 200, unit: "MW" }],
    contribution_mapping: [
      { indicator_id: "NDPIV-O4-05", contribution_type: "Direct", contribution_logic: "Adds to installed capacity." },
      { indicator_id: "TF-08", contribution_type: "Direct", contribution_logic: "Tenfold energy capacity floor." },
      { indicator_id: "NDC-EN-04", contribution_type: "Direct", contribution_logic: "NDC generation target." },
    ],
    evidence_links: ["UEGCL pipeline note 2025"],
    decision_log: [],
    blockers: ["Land acquisition pending for one site"],
  },
  {
    id: "ACT-COOK-003",
    name: "Clean cooking distribution — peri-urban",
    implementing_entity: "MEMD with private partners",
    ministry_or_agency: "MEMD",
    district: "Wakiso",
    start_date: "2025-04-01",
    end_date: "2027-03-31",
    status: "Active",
    outputs: [{ description: "Households receiving improved stoves", quantity: 120000, unit: "HH" }],
    contribution_mapping: [
      { indicator_id: "NDC-EN-05", contribution_type: "Direct", contribution_logic: "Increases clean cooking share." },
      { indicator_id: "NDC-EN-06", contribution_type: "Direct", contribution_logic: "Reduces biomass share for cooking." },
      { indicator_id: "NDC-FOR-01", contribution_type: "Enabling", contribution_logic: "Reduces charcoal pressure on forests." },
    ],
    evidence_links: ["MEMD biennial energy survey 2024"],
    decision_log: [],
  },
];
