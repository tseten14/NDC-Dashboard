import assert from "node:assert/strict";
import { climateTraceUrl, fetchUpstream } from "../config/climateTrace.js";

const api = process.env.VERIFY_TRANSLATOR_API ?? "http://localhost:8787/api/v1";
const geometry = { type: "Polygon", coordinates: [[[32.4, -0.1], [32.9, -0.1], [32.9, 0.7], [32.4, 0.7], [32.4, -0.1]]] };
const metadata = await fetch(`${api}/emissions/translator/metadata`).then((response) => { assert.equal(response.status, 200); return response.json(); });
for (const year of [metadata.default_year, metadata.years.at(-1)]) {
  const raw = await fetchUpstream(climateTraceUrl("/sources", { year, gas: "co2e_100yr", gadmId: "UGA", limit: 5000 }), "verification");
  assert(raw.length < 5000, "Verification requires a complete country page; update this check if Uganda exceeds 5000 records");
  assert.equal(new Set(raw.map((source) => `${source.id}:${source.subsector}`)).size, raw.length, "Raw country page contains duplicate records");
  const expected = raw.filter((source) => source.centroid?.longitude >= 32.4 && source.centroid.longitude <= 32.9 && source.centroid.latitude >= -0.1 && source.centroid.latitude <= 0.7);
  const response = await fetch(`${api}/emissions/polygon-insights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geometry, year }), signal: AbortSignal.timeout(60000) });
  const report = await response.json();
  assert.equal(response.status, 200, JSON.stringify(report));
  assert.equal(report.source_count, expected.length);
  const expectedMt = expected.reduce((sum, source) => sum + (source.emissionsQuantity ?? 0), 0) / 1e6;
  assert(Math.abs(report.mapped_total_mtco2e - expectedMt) < 1e-10, "Raw source tonnes disagree with report total");
  assert(Math.abs(report.sectors.reduce((sum, sector) => sum + (sector.mtco2e ?? 0), 0) - expectedMt) < 1e-10);
  assert(report.coverage.complete_pagination);
  assert.equal(report.coverage.duplicate_rows, 0);
  assert.equal(report.provenance.api_dataset_release, null);
  assert.equal(report.period.complete_year, year === metadata.default_year);
  assert.equal(report.trend.filter((entry) => entry.status === "unavailable").length, 0);
  console.log(JSON.stringify({ year, country_records: raw.length, polygon_records: report.source_count, raw_mtco2e: expectedMt, report_mtco2e: report.mapped_total_mtco2e, full_year: report.period.complete_year, district_names: report.intersected_districts.map((district) => district.name) }));
}
const invalid = await fetch(`${api}/emissions/polygon-insights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ geometry: { type: "Polygon", coordinates: [null] }, year: metadata.default_year }) });
assert.equal(invalid.status, 400);
console.log("PASS: live Climate TRACE polygon reconciliation, complete source retrieval, complete/partial periods, all trend years, and malformed request handling.");
