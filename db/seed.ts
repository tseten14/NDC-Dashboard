/**
 * Seed loader — data mirrored from climate-data.ts + uganda-strategy-data.ts
 * via data/persistenceSeedSource.js (Node-safe, no Vite path aliases).
 */
import { getDb, isDatabaseConfigured } from "./index.js";
import { observations, targets } from "./schema.js";
import { observationUuid, targetUuid } from "./id.js";
import { mapClimateSectors, mapStrategyKpis } from "./seedMappings.js";
import { climateSectorsForSeed, strategyKpis, strategyProgressRecords } from "../data/persistenceSeedSource.js";

export async function runSeed(): Promise<{ targets: number; observations: number }> {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is required to seed");
  }

  const db = getDb();
  const climate = mapClimateSectors(climateSectorsForSeed());
  const strategy = mapStrategyKpis(strategyKpis, strategyProgressRecords);
  const allTargets = [...climate.targets, ...strategy.targets];
  const allObservations = [...climate.observations, ...strategy.observations];

  const now = new Date();

  for (const t of allTargets) {
    await db
      .insert(targets)
      .values({
        id: targetUuid(t.legacyKey),
        sector: t.sector,
        baselineYear: t.baselineYear,
        targetYear: t.targetYear,
        metricType: t.metricType,
        baselineValue: String(t.baselineValue),
        targetValue: String(t.targetValue),
        unit: t.unit,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  for (const o of allObservations) {
    await db
      .insert(observations)
      .values({
        id: observationUuid(o.legacyKey),
        targetId: targetUuid(o.targetLegacyKey),
        year: o.year,
        value: String(o.value),
        source: o.source,
        asOf: o.asOf,
        isEstimated: o.isEstimated,
        isValidated: o.isValidated,
        qaqcStatus: o.qaqcStatus,
        createdAt: now,
      })
      .onConflictDoNothing();
  }

  const targetCount = await db.select({ id: targets.id }).from(targets);
  const observationCount = await db.select({ id: observations.id }).from(observations);

  return { targets: targetCount.length, observations: observationCount.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.env.SEED_DB !== "true") {
    console.log("[db:seed] SEED_DB is not true — skipping seed");
    process.exit(0);
  }

  runSeed()
    .then((counts) => {
      console.log(`[db:seed] Seeded ${counts.targets} targets, ${counts.observations} observations`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[db:seed] Failed:", err);
      process.exit(1);
    });
}
