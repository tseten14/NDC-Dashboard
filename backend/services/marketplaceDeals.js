/**
 * Marketplace deals persistence.
 *
 * CRUD for the pitch-evaluate-deliver pipeline. Only persisted submissions are
 * served. A missing database is unavailable, never a sample project portfolio.
 */
import { eq, asc } from "drizzle-orm";
import { getDb } from "../../database/index.ts";
import { marketplaceDeals } from "../../database/schema.ts";
import { getPersistenceMode } from "../../database/bootstrap.ts";
import { isLegacyExampleDeal } from "./marketplaceProvenance.js";

function formatRow(row) {
  return {
    id: row.id,
    title: row.title,
    ministry: row.ministry,
    sector: row.sector,
    sectorId: row.sectorId ?? row.sector_id,
    geography: row.geography,
    stage: row.stage,
    problem: row.problem,
    intervention: row.intervention,
    askM: Number(row.askM ?? row.ask_m),
    coFinanceM: Number(row.coFinanceM ?? row.co_finance_m),
    annualMtCO2e: Number(row.annualMtCO2e ?? row.annual_mt_co2e),
    instrument: row.instrument,
    ndcTarget: row.ndcTarget ?? row.ndc_target,
    readiness: row.readiness ?? [],
    evidence: row.evidence ?? {},
    evaluation: row.evaluation ?? {},
    milestones: row.milestones ?? [],
    createdAt: row.createdAt ?? row.created_at,
    updatedAt: row.updatedAt ?? row.updated_at,
  };
}

export async function listDeals() {
  const { mode } = getPersistenceMode();
  if (mode === "postgres") {
    const db = getDb();
    const rows = await db.select().from(marketplaceDeals).orderBy(asc(marketplaceDeals.createdAt));
    return rows.map(formatRow).filter((deal) => !isLegacyExampleDeal(deal));
  }
  throw new Error("Database not configured — marketplace submissions are unavailable");
}

export async function getDeal(id) {
  const { mode } = getPersistenceMode();
  if (mode === "postgres") {
    const db = getDb();
    const rows = await db.select().from(marketplaceDeals).where(eq(marketplaceDeals.id, id));
    const deal = rows.length ? formatRow(rows[0]) : null;
    return deal && !isLegacyExampleDeal(deal) ? deal : null;
  }
  throw new Error("Database not configured — marketplace submissions are unavailable");
}

export async function createDeal(data) {
  validateDealNumbers(data);
  const { mode } = getPersistenceMode();
  if (mode !== "postgres") {
    throw new Error("Database not configured — cannot create deals");
  }
  const db = getDb();
  const now = new Date();
  const id = data.id || `uga-${Date.now().toString(36)}`;
  const row = {
    id,
    title: data.title,
    ministry: data.ministry,
    sector: data.sector,
    sectorId: data.sectorId,
    geography: data.geography,
    stage: data.stage || "Concept",
    problem: data.problem,
    intervention: data.intervention,
    askM: String(data.askM),
    coFinanceM: String(data.coFinanceM),
    annualMtCO2e: String(data.annualMtCO2e),
    instrument: data.instrument,
    ndcTarget: data.ndcTarget,
    readiness: data.readiness || [],
    evidence: data.evidence || {},
    evaluation: data.evaluation || {},
    milestones: data.milestones || [],
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(marketplaceDeals).values(row);
  return formatRow(row);
}

export async function updateDeal(id, data) {
  validateDealNumbers(data, true);
  const { mode } = getPersistenceMode();
  if (mode !== "postgres") {
    throw new Error("Database not configured — cannot update deals");
  }
  const db = getDb();
  const updates = { updatedAt: new Date() };
  const fields = [
    "title", "ministry", "sector", "sectorId", "geography", "stage",
    "problem", "intervention", "instrument", "ndcTarget",
    "readiness", "evidence", "evaluation", "milestones",
  ];
  for (const f of fields) {
    if (data[f] !== undefined) updates[f] = data[f];
  }
  if (data.askM !== undefined) updates.askM = String(data.askM);
  if (data.coFinanceM !== undefined) updates.coFinanceM = String(data.coFinanceM);
  if (data.annualMtCO2e !== undefined) updates.annualMtCO2e = String(data.annualMtCO2e);

  const result = await db.update(marketplaceDeals).set(updates).where(eq(marketplaceDeals.id, id)).returning();
  return result.length ? formatRow(result[0]) : null;
}

export async function deleteDeal(id) {
  const { mode } = getPersistenceMode();
  if (mode !== "postgres") {
    throw new Error("Database not configured — cannot delete deals");
  }
  const db = getDb();
  const result = await db.delete(marketplaceDeals).where(eq(marketplaceDeals.id, id)).returning({ id: marketplaceDeals.id });
  return result.length > 0;
}

export function validateDealNumbers(data, partial = false) {
  for (const field of ["askM", "coFinanceM", "annualMtCO2e"]) {
    if (partial && data?.[field] === undefined) continue;
    const value = data?.[field];
    if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
      const error = new Error(`${field} must be an explicit, finite, non-negative number`);
      error.status = 400;
      throw error;
    }
  }
}
