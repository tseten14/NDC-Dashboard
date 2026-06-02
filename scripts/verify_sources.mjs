/**
 * Verify the Climate TRACE /v7/sources (asset/source-level) integration.
 * Confirms the live response shape parses through our schema-backed fetchSources
 * helper for both national (UGA) and a sample district (Kampala, UGA.16_1).
 *
 * Run: node scripts/verify_sources.mjs
 */
import { fetchSources, latestInventoryYear } from "../config/climateTrace.js";

const YEAR = parseInt(process.env.VERIFY_YEAR || String(latestInventoryYear()), 10);

async function show(label, gadmId) {
  console.log(`\n=== ${label} (${gadmId}, ${YEAR}) ===`);
  const { count, sources } = await fetchSources({ gadmId, year: YEAR, limit: 10 });
  console.log(`Returned ${count} source rows (sorted by emissions desc):`);
  for (const s of sources) {
    const tag = s.is_asset ? "ASSET" : "AGG";
    console.log(
      `  [${tag}] ${s.name ?? "—"} | ${s.sector ?? "—"}/${s.subsector ?? "—"} | ${s.emissions_mtco2e ?? "—"} Mt`,
    );
  }
}

async function main() {
  console.log("Climate TRACE /v7/sources verification");
  await show("Uganda national", "UGA");
  await show("Kampala district", "UGA.16_1");
  console.log("\nOK: sources responses parsed and normalized successfully.");
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
