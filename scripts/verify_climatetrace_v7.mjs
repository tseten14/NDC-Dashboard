/** Live reconciliation against raw Climate TRACE replies, not test fixtures.
 * VERIFY_YEAR defaults to the latest complete year. VERIFY_GADM defaults to UGA.
 * Optionally set VERIFY_APP_URL to compare a running/deployed API as well.
 */
import assert from "node:assert/strict";
import { SECTOR_MAP, ALL_TRACE_SLUGS } from "../config/ndcTargets.js";
import { climateTraceUrl, latestInventoryYear, CLIMATE_TRACE_GAS } from "../config/climateTrace.js";
import { roundMtco2e } from "../shared/emissionsUnits.js";
import { getEmissionsDashboard } from "../backend/services/emissionsData.js";

const year = Number(process.env.VERIFY_YEAR ?? latestInventoryYear());
const gadm = process.env.VERIFY_GADM ?? "UGA";
assert(Number.isInteger(year) && year >= 2015 && year <= latestInventoryYear(), "Use a complete inventory year");
async function read(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  assert(r.ok, `Request failed (${r.status}): ${url}`);
  return r.json();
}
function match(actual, expected, label) {
  assert(expected != null && Number.isFinite(expected), `${label}: missing upstream value`);
  assert.equal(actual, expected, `${label}: app does not match raw TRACE after unit conversion`);
}
const url = climateTraceUrl("/sources/emissions", { year, gas: CLIMATE_TRACE_GAS, gadmId: gadm });
const raw = await read(url);
const totalTonnes = raw.totals?.summaries?.find((s) => s.gas === CLIMATE_TRACE_GAS)?.emissionsQuantity;
assert(Number.isFinite(totalTonnes), "Missing upstream total");
const tonnes = {};
for (const row of raw.sectors?.summaries ?? []) {
  if (row.gas !== CLIMATE_TRACE_GAS) continue;
  assert(Number.isFinite(row.emissionsQuantity), `Missing upstream sector: ${row.sector}`);
  tonnes[row.sector] = (tonnes[row.sector] ?? 0) + row.emissionsQuantity;
}
for (const slug of ALL_TRACE_SLUGS) assert(Number.isFinite(tonnes[slug]), `Missing ${slug}`);
const allSum = Object.values(tonnes).reduce((sum, value) => sum + value, 0);
assert(Math.abs(allSum - totalTonnes) < 1, "Raw sector sum differs from raw country total by more than one tonne");
const dashboards = [["local service", await getEmissionsDashboard(year, year, { gadmId: gadm })]];
if (process.env.VERIFY_APP_URL) {
  const base = process.env.VERIFY_APP_URL.replace(/\/$/, "");
  const health = await read(`${base}/api/v1/health`);
  assert.equal(health.mock_mode, false, "Deployed API is in mock mode");
  dashboards.push(["deployed API", await read(`${base}/api/v1/emissions/dashboard?since=${year}&to=${year}&gadm_id=${gadm}`)]);
}
for (const [label, d] of dashboards) {
  assert.equal(d.inventory_year, year);
  assert.equal(d.gadm_id, gadm);
  assert(!/mock|bundled/i.test(d.data_source));
  match(d.total_co2e_mtco2e, roundMtco2e(totalTonnes / 1e6), `${label} total`);
  match(d.total_timeseries?.find((p) => p.year === year)?.value, roundMtco2e(totalTonnes / 1e6), `${label} economy-wide chart`);
  for (const [sector, slugs] of Object.entries(SECTOR_MAP)) {
    const expected = roundMtco2e(slugs.reduce((sum, slug) => sum + tonnes[slug], 0) / 1e6);
    match(d.timeseries[sector]?.[0]?.value, expected, `${label} ${sector} chart`);
    match(d.progress[sector]?.latest_value, expected, `${label} ${sector} latest value`);
    console.log(`${label}: ${sector} ${expected} MtCO2e — matches`);
  }
  assert.equal(d.progress.afolu.progress_pct, null, "Forestry cannot score the full AFOLU pledge");
  assert.equal(d.progress.agriculture.progress_pct, null, "No official standalone agriculture emissions pledge");
  console.log(`${label}: ${gadm} ${year} total ${d.total_co2e_mtco2e} MtCO2e (${totalTonnes} raw tonnes) — matches`);
}
console.log(`PASS: raw -> service -> dashboard; ${url}`);
