import "dotenv/config";
import {
  SECTOR_MAP,
  ALL_SECTOR_SLUGS,
  YEARS,
  SLUG_TO_UI_SECTOR,
} from "../config/ndcTargets.js";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";

const BASE_URL = "https://api.climatetrace.org/v6";
const DELAY_MS = 300;
const DRY_RUN = process.argv.includes("--dry-run");
const FILTER_YEAR = process.argv.find((a) => a.startsWith("--year="))?.split("=")[1];
const FILTER_SECTOR = process.argv.find((a) => a.startsWith("--sector="))?.split("=")[1];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function toMtco2e(tonnes) {
  if (tonnes == null || Number.isNaN(Number(tonnes))) return null;
  return +(+tonnes / 1_000_000).toFixed(2);
}

/**
 * Parse a single-row or latest snapshot shape (no year in payload).
 */
function extractEmissions(responseArray, requestedYear, requestedSlug) {
  if (!Array.isArray(responseArray) || responseArray.length === 0) {
    console.warn(`  [SKIP] Empty response for year=${requestedYear} slug=${requestedSlug}`);
    return null;
  }

  const item = responseArray.find((d) => d.country === "UGA") || responseArray[0];
  if (!item?.emissions?.co2e_100yr) {
    console.warn(`  [SKIP] No co2e_100yr in response for year=${requestedYear} slug=${requestedSlug}`);
    console.warn(`  Raw:`, JSON.stringify(item).slice(0, 200));
    return null;
  }

  const year = item.year ?? requestedYear;
  const value = toMtco2e(item.emissions.co2e_100yr);
  return { year, value };
}

/**
 * If API returns a multi-year array with `year` on each row, collect UGA points.
 */
function tryParseBulkTimeseries(data) {
  if (!Array.isArray(data) || data.length < 2) return [];
  const out = [];
  for (const row of data) {
    if (row?.country !== "UGA") continue;
    if (row.year == null || !row.emissions?.co2e_100yr) continue;
    out.push({ year: row.year, value: toMtco2e(row.emissions.co2e_100yr) });
  }
  return out;
}

async function fetchYearSector(year, slug) {
  const url = `${BASE_URL}/country/emissions?countries=UGA&sectors=${encodeURIComponent(
    slug,
  )}&since=${year}&to=${year}`;
  console.log(`  Fetching: ${url}`);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return extractEmissions(data, year, slug);
  } catch (err) {
    console.error(`  [ERROR] year=${year} slug=${slug}: ${err.message}`);
    return null;
  }
}

function aggregateToUiSectors(rawResults) {
  const grouped = {};
  const unmapped = new Set();

  for (const { year, slug, value } of rawResults) {
    if (value === null || value === undefined) continue;

    const uiSector = SLUG_TO_UI_SECTOR[slug];
    if (!uiSector) {
      unmapped.add(slug);
      continue;
    }

    const key = `${year}:${uiSector}`;
    grouped[key] = +((grouped[key] || 0) + value).toFixed(2);
  }

  if (unmapped.size > 0) {
    console.warn("\n[WARNING] Unmapped slugs (update SLUG_TO_UI_SECTOR):", [...unmapped]);
  }

  return grouped;
}

async function main() {
  console.log(`\n=== Climate TRACE Seeding Script ===`);
  console.log(`DRY_RUN: ${DRY_RUN}`);
  console.log(`Fetching Uganda (UGA) emissions from Climate TRACE API\n`);

  const rawResults = [];

  console.log("--- Attempting bulk fetch first ---");
  try {
    const bulkUrl = `${BASE_URL}/country/emissions?countries=UGA&since=2015&to=2023`;
    console.log(`Trying: ${bulkUrl}`);
    const res = await fetch(bulkUrl);
    const data = await res.json();
    console.log(`Bulk response (first 2 items):`, JSON.stringify(data?.slice?.(0, 2) ?? data, null, 2));

    const bulkSeries = tryParseBulkTimeseries(data);
    if (bulkSeries.length > 0) {
      console.log(`✓ Bulk fetch returned ${bulkSeries.length} dated rows (national aggregate — no per-slug split). Not writing slug-level rows from bulk.`);
    } else {
      console.log("✗ Bulk fetch did not yield a per-year array with year fields. Using per-year × slug loop.");
    }
  } catch (err) {
    console.error("Bulk fetch failed:", err.message);
  }

  await sleep(DELAY_MS);

  const years = FILTER_YEAR ? [parseInt(FILTER_YEAR, 10)] : YEARS;
  const slugs = FILTER_SECTOR
    ? SECTOR_MAP[FILTER_SECTOR] || [FILTER_SECTOR]
    : ALL_SECTOR_SLUGS;

  console.log(`\n--- Starting loop: ${years.length} years × ${slugs.length} slugs ---\n`);

  for (const year of years) {
    for (const slug of slugs) {
      const result = await fetchYearSector(year, slug);
      rawResults.push({ year, slug, value: result?.value ?? null });
      await sleep(DELAY_MS);
    }
  }

  const aggregated = aggregateToUiSectors(rawResults);

  console.log("\n=== Summary Table ===");
  console.log("year | sector      | co2e_mtco2e");
  console.log("---- | ----------- | -----------");
  for (const key of Object.keys(aggregated).sort()) {
    const [year, sector] = key.split(":");
    console.log(`${year} | ${sector.padEnd(11)} | ${aggregated[key]}`);
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No DB writes performed.");
    return;
  }

  console.log("\n--- Writing to DB ---");
  const supabase = getSupabaseAdmin();
  const rows = Object.entries(aggregated).map(([key, co2e_mtco2e]) => {
    const [year, sector] = key.split(":");
    return {
      country: "UGA",
      year: parseInt(year, 10),
      sector,
      co2e_mtco2e,
      source: "climatetrace_api_v6",
    };
  });

  const chunk = 40;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from("climatetrace_emissions").upsert(slice, {
      onConflict: "country,year,sector",
    });
    if (error) throw new Error(error.message);
  }

  console.log(`\n✓ Seeding complete. ${rows.length} rows upserted.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
