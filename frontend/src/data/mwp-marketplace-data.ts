/**
 * MWP Marketplace — Uganda implementation deal room data.
 *
 * Shared types and formatting for submitted pitches. Bundled demonstration
 * pitches are excluded from the production pipeline.
 */

/* ── Stages ──────────────────────────────────────────────────────────── */

export const DEAL_STAGES = ["Concept", "Pitched", "Under review", "In delivery"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];

const STAGE_TONE: Record<DealStage, string> = {
  Concept:        "bg-slate-500/10 text-slate-600 border-slate-500/30",
  Pitched:        "bg-blue-500/10 text-blue-600 border-blue-500/30",
  "Under review": "bg-amber-500/10 text-amber-600 border-amber-500/30",
  "In delivery":  "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
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

/** No bundled projects. The marketplace only displays persisted submissions. */
export const DEALS: DealPitch[] = [];

/* ── Helpers ──────────────────────────────────────────────────────────── */

export function getDeal(id: string): DealPitch | undefined {
  return DEALS.find((d) => d.id === id);
}

export function fmtUSD(m: number): string {
  if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  if (m >= 1) return `$${m.toFixed(0)}M`;
  return `$${(m * 1000).toFixed(0)}K`;
}
