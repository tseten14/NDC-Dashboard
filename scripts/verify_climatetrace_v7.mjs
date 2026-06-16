/**
 * Cross-check Climate TRACE v7 API responses vs our dashboard aggregation.
 * Run: node scripts/verify_climatetrace_v7.mjs
 */
import { SECTOR_MAP, ALL_TRACE_SLUGS } from "../config/ndcTargets.js";
import {
  fetchSectorEmissionsForYear,
  fetchUgandaCountryRanking,
  toMtco2e,
  climateTraceUrl,
} from "../config/climateTrace.js";
import { getUiSectorTimeseries } from "../backend/services/climateTraceTimeseries.js";

const YEAR = parseInt(process.env.VERIFY_YEAR || "2023", 10);
const GADM = "UGA";
const DELTA_TOLERANCE_MT = parseFloat(process.env.VERIFY_DELTA_TOLERANCE || "0.1");

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}\n${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function main() {
  console.log("=== Climate TRACE v7 verification (Uganda) ===\n");
  console.log(`Reference year: ${YEAR}\n`);

  // 1) Country ranking (official total for comparison)
  const rank = await fetchUgandaCountryRanking(YEAR);
  const rankMt = toMtco2e(rank.emissionsQuantity);
  console.log("1) Country ranking (/v7/rankings/countries)");
  console.log(`   Total: ${rankMt} MtCO2e | Rank: #${rank.rank} | Raw tonnes: ${rank.emissionsQuantity}\n`);

  // 2) Per-slug via our fetch helper (same as dashboard)
  console.log("2) Per-sector slug (/v7/sources/emissions, one slug per request)");
  const slugMt = {};
  let slugSum = 0;
  for (const slug of ALL_TRACE_SLUGS) {
    const row = await fetchSectorEmissionsForYear(YEAR, slug);
    slugMt[slug] = row?.mtco2e ?? null;
    if (row?.mtco2e != null) slugSum += row.mtco2e;
    console.log(`   ${slug.padEnd(28)} ${row?.mtco2e ?? "null"} Mt`);
  }
  slugSum = +slugSum.toFixed(2);
  console.log(`   Sum of ${ALL_TRACE_SLUGS.length} slugs: ${slugSum} Mt\n`);

  // 3) API pitfall: repeated sectors= param (only first sector returned)
  const multiUrl = climateTraceUrl("/sources/emissions", {
    year: YEAR,
    gas: "co2e_100yr",
    gadmId: GADM,
    sectors: "power",
  });
  const multiUrlBad = `${multiUrl}&sectors=transportation&sectors=buildings`;
  const multi = await fetchJson(multiUrlBad);
  const multiMt = toMtco2e(
    multi?.totals?.summaries?.find((s) => s.gas === "co2e_100yr")?.emissionsQuantity,
  );
  console.log("3) Multi-sector query pitfall (repeated sectors=)");
  console.log(`   power+transport+buildings in one URL → ${multiMt} Mt (should ≈ power only: ${slugMt.power})\n`);

  // 4) Our UI sector aggregation
  console.log("4) Dashboard UI sectors (our SECTOR_MAP sum)");
  const ui = {};
  for (const [sector, slugs] of Object.entries(SECTOR_MAP)) {
    const vals = await Promise.all(slugs.map((s) => fetchSectorEmissionsForYear(YEAR, s)));
    const parts = slugs.map((s, i) => ({ slug: s, mt: vals[i]?.mtco2e ?? null }));
    const allPresent = parts.every((p) => p.mt != null);
    const sum = allPresent ? +parts.reduce((a, p) => a + p.mt, 0).toFixed(2) : null;
    ui[sector] = sum;
    const detail = parts.map((p) => `${p.slug}=${p.mt}`).join(" + ");
    console.log(`   ${sector.padEnd(12)} ${sum ?? "null"} Mt  (${detail})`);
  }
  const uiSum = Object.values(ui).reduce((a, v) => a + (v ?? 0), 0);
  console.log(`   Sum of 5 UI sectors: ${+uiSum.toFixed(2)} Mt (agriculture separate from AFOLU by design)\n`);

  // 5) Timeseries service (cached path)
  const afoluSeries = await getUiSectorTimeseries("afolu", YEAR, YEAR);
  const energySeries = await getUiSectorTimeseries("energy", YEAR, YEAR);
  console.log("5) getUiSectorTimeseries (dashboard code path)");
  console.log(`   afolu ${YEAR}: ${afoluSeries[0]?.value} Mt`);
  console.log(`   energy ${YEAR}: ${energySeries[0]?.value} Mt\n`);

  // 6) Reconciliation
  const gapRankVsSlugs = +(rankMt - slugSum).toFixed(2);
  const gapRankVsUi = +(rankMt - uiSum).toFixed(2);
  console.log("6) Reconciliation");
  console.log(`   Ranking total − sum(all 8 slugs): ${gapRankVsSlugs} Mt`);
  console.log(`   Ranking total − sum(5 UI sectors):  ${gapRankVsUi} Mt`);
  console.log(
    "   Note: Gaps are expected — ranking is all sectors; we map a subset to NDC buckets.",
  );
  console.log("   AFOLU uses forestry-and-land-use only (not agriculture slug).\n");

  // 7) List available sectors from API metadata if present
  try {
    const meta = await fetchJson(climateTraceUrl("/sources/emissions", { year: YEAR, gadmId: GADM, gas: "co2e_100yr" }));
    const sectorsInResponse = meta?.sectors ?? meta?.availableSectors ?? null;
    if (sectorsInResponse) {
      console.log("7) Sectors listed in unfiltered emissions response:", sectorsInResponse);
    }
  } catch {
    /* optional */
  }

  // 8) Sanity: NDC baseline comparison (policy vs observed — not a bug)
  console.log("\n8) NDC policy baselines vs Climate TRACE observed (2023) — different frameworks");
  const ndc = { afolu: 42.5, energy: 6.2, agriculture: 28.4, ippu: 1.8, waste: 3.8 };
  for (const [s, baseline] of Object.entries(ndc)) {
    const obs = ui[s];
    if (obs != null) {
      const diff = +(obs - baseline).toFixed(2);
      console.log(`   ${s}: NDC baseline ${baseline} vs TRACE ${obs} Mt (Δ ${diff})`);
    }
  }

  let failed = false;
  if (Math.abs(gapRankVsSlugs) > DELTA_TOLERANCE_MT) {
    console.error(
      `\nFAIL: |ranking − slug sum| = ${Math.abs(gapRankVsSlugs)} Mt exceeds tolerance ${DELTA_TOLERANCE_MT} Mt`,
    );
    failed = true;
  } else {
    console.log(`\nOK: ranking vs slug sum within ${DELTA_TOLERANCE_MT} Mt tolerance`);
  }

  console.log("\n=== Done ===");
  if (failed) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
