/**
 * Discover / refresh the Uganda district → Climate TRACE GADM mapping.
 *
 * Climate TRACE v7 exposes Uganda's districts as GADM level-1 administrative
 * areas. This script lists them, cross-checks against the mapping baked into
 * config/ugandaDistrictGadm.js, optionally probes whether each district returns
 * emissions for a reference year, and reports any drift.
 *
 * Run:
 *   node scripts/discover_uganda_gadm.mjs            # list + diff vs config
 *   PROBE=1 node scripts/discover_uganda_gadm.mjs    # also probe emissions
 *   VERIFY_YEAR=2023 node scripts/discover_uganda_gadm.mjs
 */
import {
  CLIMATE_TRACE_BASE_URL,
  CLIMATE_TRACE_GAS,
  climateTraceUrl,
} from "../config/climateTrace.js";
import {
  DISTRICTS,
  resolveDistrictGadm,
  getDistrictName,
} from "../config/ugandaDistrictGadm.js";

const YEAR = parseInt(process.env.VERIFY_YEAR || "2023", 10);
const PROBE = process.env.PROBE === "1";
const EXCLUDED_LEVEL1 = new Set(["Lake Albert", "Lake Victoria"]);

async function fetchJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}\n${text.slice(0, 200)}`);
  return JSON.parse(text);
}

function cleanName(name) {
  return name.replace(/\s+District$/i, "").trim();
}

async function main() {
  console.log("=== Uganda GADM district discovery (Climate TRACE v7) ===\n");
  console.log(`Base: ${CLIMATE_TRACE_BASE_URL}`);

  const subdivisions = await fetchJson(
    `${CLIMATE_TRACE_BASE_URL}/admins/UGA/subdivisions`,
  );
  const live = subdivisions
    .filter((a) => a.level === 1 && !EXCLUDED_LEVEL1.has(a.name))
    .map((a) => ({ name: cleanName(a.name), gadm_id: a.id }));

  console.log(`Live districts from API: ${live.length}`);
  console.log(`Districts in config:     ${DISTRICTS.length}\n`);

  const configByGadm = new Map(DISTRICTS.map((d) => [d.gadm_id, d.name]));
  const liveByGadm = new Map(live.map((d) => [d.gadm_id, d.name]));

  const missingInConfig = live.filter((d) => !configByGadm.has(d.gadm_id));
  const staleInConfig = DISTRICTS.filter((d) => !liveByGadm.has(d.gadm_id));

  if (missingInConfig.length === 0 && staleInConfig.length === 0) {
    console.log("OK: config mapping matches the live API district set.");
  } else {
    if (missingInConfig.length) {
      console.log("Districts present in API but MISSING from config:");
      for (const d of missingInConfig) console.log(`  + ${d.gadm_id}  ${d.name}`);
    }
    if (staleInConfig.length) {
      console.log("Districts in config but NOT in API (stale):");
      for (const d of staleInConfig) console.log(`  - ${d.gadm_id}  ${d.name}`);
    }
  }

  // Sanity check the resolver against a few names/aliases.
  const resolveChecks = ["Kampala", "Wakiso", "Fort Portal", "Luweero", "UGA.16_1"];
  console.log("\nResolver checks:");
  for (const q of resolveChecks) {
    const gid = resolveDistrictGadm(q);
    console.log(`  ${q.padEnd(14)} -> ${gid ?? "null"}${gid ? ` (${getDistrictName(gid)})` : ""}`);
  }

  if (PROBE) {
    console.log(`\nProbing emissions for ${YEAR} (all sectors)...`);
    let withData = 0;
    for (const d of live) {
      const url = climateTraceUrl("/sources/emissions", {
        year: YEAR,
        gas: CLIMATE_TRACE_GAS,
        gadmId: d.gadm_id,
      });
      try {
        const json = await fetchJson(url);
        const mt = json?.totals?.summaries?.[0]?.emissionsQuantity ?? null;
        if (mt != null) withData++;
        console.log(`  ${d.name.padEnd(16)} ${mt != null ? (mt / 1e6).toFixed(3) + " Mt" : "null"}`);
      } catch (err) {
        console.log(`  ${d.name.padEnd(16)} ERROR ${err.message.split("\n")[0]}`);
      }
    }
    console.log(`\nDistricts returning data: ${withData}/${live.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
