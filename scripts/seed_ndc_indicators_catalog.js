/**
 * Seeds ndc_indicator_* and ndc_catalog_* tables (Supabase).
 * Mirrors current cockpit demo content so the UI can load it via /api/v1/* instead of bundled TS.
 *
 * Usage: node scripts/seed_ndc_indicators_catalog.js [--dry-run]
 */
import "dotenv/config";
import { getSupabaseAdmin } from "../services/supabaseAdmin.js";

const DRY = process.argv.includes("--dry-run");

function histRows(targetId, baseline, start, end, deltaPerYear) {
  const rows = [];
  for (let y = start; y <= end; y++) {
    const v = Math.round((baseline + deltaPerYear * (y - start)) * 100) / 100;
    rows.push({ target_id: targetId, year: y, value: v });
  }
  return rows;
}

const INDICATOR_META = [
  {
    target_id: "t2",
    baseline_year: 2015,
    baseline_value: 12.4,
    target_year: 2030,
    target_value: 21,
    unit: "% land area",
    data_providers: ["Earth Observation (Copernicus)", "National Forestry Authority"],
    source_type: "observed-eo",
    mrv_owner_ministry: "Ministry of Water and Environment",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: "2024-10-20T14:00:00Z",
  },
  {
    target_id: "t3",
    baseline_year: 2015,
    baseline_value: 62,
    target_year: 2030,
    target_value: 80,
    unit: "% renewable",
    data_providers: ["Ministry MRV", "Uganda Electricity Regulatory Authority"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Energy and Mineral Development",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: "2024-09-01T10:00:00Z",
  },
  {
    target_id: "t5",
    baseline_year: 2015,
    baseline_value: 5,
    target_year: 2030,
    target_value: 30,
    unit: "% modal shift",
    data_providers: ["Ministry MRV"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Works and Transport",
    qaqc_status: "missing",
    is_validated: false,
    last_updated: "2023-12-01T09:00:00Z",
  },
  {
    target_id: "t8",
    baseline_year: 2015,
    baseline_value: 10,
    target_year: 2030,
    target_value: 50,
    unit: "% CSA adoption",
    data_providers: ["Ministry MRV", "FAO"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Agriculture, Animal Industry and Fisheries",
    qaqc_status: "warning",
    is_validated: false,
    last_updated: "2024-06-01T08:00:00Z",
  },
];

const ACTIVITIES = [
  { id: "a1", target_id: "t1", sort_order: 0, body: { id: "a1", targetId: "t1", name: "National Reforestation Programme", description: "Plant 3 billion trees by 2030 across degraded landscapes", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Forestry Sector Support Department", focalPoint: { name: "Dr. Sarah Namirembe", role: "Director, Forestry", email: "s.namirembe@mwe.go.ug" }, implementationLevel: "both", districts: ["Kampala", "Wakiso", "Mukono", "Mbarara", "Gulu", "Lira"] } },
  { id: "a2", target_id: "t1", sort_order: 1, body: { id: "a2", targetId: "t1", name: "REDD+ Strategy Implementation", description: "Reduce emissions from deforestation and forest degradation", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Climate Change Department", focalPoint: { name: "Mr. Bob Natifu", role: "Commissioner, Climate Change", email: "b.natifu@mwe.go.ug" }, implementationLevel: "national" } },
  { id: "a3", target_id: "t2", sort_order: 0, body: { id: "a3", targetId: "t2", name: "Community Forest Restoration", description: "Community-led forest restoration targeting 500,000 hectares", responsibleMinistry: "Ministry of Water and Environment", focalPoint: { name: "Ms. Grace Akello", role: "Senior Forest Officer", email: "g.akello@mwe.go.ug" }, implementationLevel: "district", districts: ["Hoima", "Masindi", "Kibaale", "Kyenjojo", "Bundibugyo"] } },
  { id: "a4", target_id: "t3", sort_order: 0, body: { id: "a4", targetId: "t3", name: "Solar Energy Scale-Up", description: "Deploy 500 MW additional solar PV capacity by 2030", responsibleMinistry: "Ministry of Energy and Mineral Development", responsibleDepartment: "Renewable Energy Department", focalPoint: { name: "Eng. Peter Okwoko", role: "Director, Renewable Energy", email: "p.okwoko@memd.go.ug" }, implementationLevel: "national" } },
  { id: "a5", target_id: "t3", sort_order: 1, body: { id: "a5", targetId: "t3", name: "Rural Electrification Programme", description: "Extend clean energy access to 80% of rural households", responsibleMinistry: "Ministry of Energy and Mineral Development", focalPoint: { name: "Ms. Irene Muloni", role: "Commissioner, Energy", email: "i.muloni@memd.go.ug" }, implementationLevel: "both", districts: ["Soroti", "Arua", "Gulu", "Lira", "Moroto", "Kotido"] } },
  { id: "a6", target_id: "t4", sort_order: 0, body: { id: "a6", targetId: "t4", name: "Energy Efficiency Standards", description: "Implement mandatory energy efficiency standards for buildings and industry", responsibleMinistry: "Ministry of Energy and Mineral Development", responsibleDepartment: "Energy Efficiency Unit", focalPoint: { name: "Dr. James Opio", role: "Head of Standards", email: "j.opio@memd.go.ug" }, implementationLevel: "national" } },
  { id: "a7", target_id: "t5", sort_order: 0, body: { id: "a7", targetId: "t5", name: "Kampala BRT System", description: "Construct and operationalize Bus Rapid Transit in Greater Kampala", responsibleMinistry: "Ministry of Works and Transport", responsibleDepartment: "Transport Planning", focalPoint: { name: "Eng. David Luyimbazi", role: "Director, Transport", email: "d.luyimbazi@mowt.go.ug" }, implementationLevel: "district", districts: ["Kampala", "Wakiso", "Mukono"] } },
  { id: "a8", target_id: "t6", sort_order: 0, body: { id: "a8", targetId: "t6", name: "Landfill Gas Capture Programme", description: "Install methane capture at 10 major landfill sites nationwide", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Environmental Management", focalPoint: { name: "Dr. Mary Goretti", role: "Environmental Inspector", email: "m.goretti@mwe.go.ug" }, implementationLevel: "both", districts: ["Kampala", "Jinja", "Mbale", "Mbarara", "Gulu"] } },
  { id: "a9", target_id: "t7", sort_order: 0, body: { id: "a9", targetId: "t7", name: "HFC Phase-Down Programme", description: "Implement Kigali Amendment to phase down HFC consumption", responsibleMinistry: "Ministry of Water and Environment", focalPoint: { name: "Mr. Arnold Waiswa", role: "Ozone Officer", email: "a.waiswa@mwe.go.ug" }, implementationLevel: "national" } },
  { id: "a10", target_id: "t8", sort_order: 0, body: { id: "a10", targetId: "t8", name: "Climate-Smart Agriculture Rollout", description: "Train 2 million farmers in climate-smart agricultural practices", responsibleMinistry: "Ministry of Agriculture, Animal Industry and Fisheries", responsibleDepartment: "Crop Production Department", focalPoint: { name: "Dr. Joseph Bazaale", role: "Director, Crop Resources", email: "j.bazaale@maaif.go.ug" }, implementationLevel: "both", districts: ["Masaka", "Rakai", "Sembabule", "Pallisa", "Kumi", "Katakwi"] } },
];

const MITIGATION = [
  { id: "m1", target_id: "t1", sector_id: "afolu", sort_order: 0, body: { id: "m1", targetId: "t1", sectorId: "afolu", title: "Payment for Ecosystem Services (PES)", description: "Establish PES schemes to incentivize forest conservation by local communities", emissionsReductionPotential: 2.5, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 15, costCurrency: "USD", costMagnitude: "million/yr", confidence: "medium", bestPractices: [{ country: "Costa Rica", title: "National PES Programme", description: "Payments to landowners for forest conservation since 1997", outcome: "Forest cover increased from 21% to 52%" }, { country: "Kenya", title: "Upper Tana Water Fund", description: "PES for watershed conservation upstream of Nairobi", outcome: "30% reduction in sedimentation" }] } },
  { id: "m2", target_id: "t1", sector_id: "afolu", sort_order: 1, body: { id: "m2", targetId: "t1", sectorId: "afolu", title: "Commercial Tree Plantation Expansion", description: "Scale up commercial forestry plantations on degraded lands", emissionsReductionPotential: 3.8, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 45, costCurrency: "USD", costMagnitude: "million", confidence: "high", bestPractices: [{ country: "Ethiopia", title: "Green Legacy Initiative", description: "Planted 5 billion trees in 2019-2020", outcome: "Significant reforestation of degraded highlands" }] } },
  { id: "m3", target_id: "t3", sector_id: "energy", sort_order: 0, body: { id: "m3", targetId: "t3", sectorId: "energy", title: "Mini-Grid Solar Deployment", description: "Deploy 200 solar mini-grids in off-grid rural areas", emissionsReductionPotential: 0.8, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 120, costCurrency: "USD", costMagnitude: "million", confidence: "high", bestPractices: [{ country: "Tanzania", title: "Rural Energy Agency Mini-Grids", description: "Deployed 200+ mini-grids serving 300,000 customers", outcome: "60% reduction in kerosene usage" }] } },
  { id: "m4", target_id: "t4", sector_id: "energy", sort_order: 0, body: { id: "m4", targetId: "t4", sectorId: "energy", title: "Improved Cookstove Distribution", description: "Distribute 5 million improved cookstoves to reduce biomass fuel consumption", emissionsReductionPotential: 1.2, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 25, costCurrency: "USD", costMagnitude: "million", confidence: "medium", bestPractices: [{ country: "Rwanda", title: "National Cookstove Programme", description: "Distributed 1.5M improved stoves to households", outcome: "40% reduction in firewood consumption" }] } },
  { id: "m5", target_id: "t5", sector_id: "transport", sort_order: 0, body: { id: "m5", targetId: "t5", sectorId: "transport", title: "Electric Bus Fleet for Kampala", description: "Introduce 500 electric buses for Kampala public transit system", emissionsReductionPotential: 0.4, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 200, costCurrency: "USD", costMagnitude: "million", confidence: "low", bestPractices: [{ country: "Kenya", title: "BasiGo Electric Buses", description: "Electric bus deployment in Nairobi", outcome: "70% operating cost reduction vs diesel" }] } },
  { id: "m6", target_id: "t6", sector_id: "waste", sort_order: 0, body: { id: "m6", targetId: "t6", sectorId: "waste", title: "Waste-to-Energy Facility", description: "Build waste-to-energy plant processing 1,000 tonnes/day in Kampala", emissionsReductionPotential: 0.6, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 80, costCurrency: "USD", costMagnitude: "million", confidence: "medium", bestPractices: [{ country: "South Africa", title: "Durban Landfill Gas-to-Energy", description: "Largest CDM landfill gas project in Africa", outcome: "Generates 7.5 MW and reduces 340ktCO₂e/yr" }] } },
  { id: "m7", target_id: "t8", sector_id: "agriculture", sort_order: 0, body: { id: "m7", targetId: "t8", sectorId: "agriculture", title: "Agroforestry Integration Programme", description: "Promote agroforestry systems across 1 million hectares of farmland", emissionsReductionPotential: 1.5, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 35, costCurrency: "USD", costMagnitude: "million", confidence: "high", bestPractices: [{ country: "Malawi", title: "National Agroforestry Programme", description: "Integrated trees on 300,000 ha of farmland", outcome: "25% yield increase plus carbon sequestration" }] } },
];

async function main() {
  console.log(`\n=== Seed NDC indicators + catalog ===\nDRY_RUN=${DRY}\n`);

  const yearly = [
    ...histRows("t2", 12.4, 2015, 2024, 0.6),
    ...histRows("t3", 62, 2015, 2024, 1.5),
    ...histRows("t5", 5, 2015, 2024, 0.8),
    ...histRows("t8", 10, 2015, 2024, 2.5),
  ];

  if (DRY) {
    console.log("Would upsert meta:", INDICATOR_META.length);
    console.log("Would upsert yearly rows:", yearly.length);
    console.log("Would upsert activities:", ACTIVITIES.length);
    console.log("Would upsert mitigation:", MITIGATION.length);
    return;
  }

  const supabase = getSupabaseAdmin();

  const { error: e0 } = await supabase.from("ndc_indicator_meta").upsert(INDICATOR_META, { onConflict: "target_id" });
  if (e0) throw new Error(e0.message);

  const chunk = 50;
  for (let i = 0; i < yearly.length; i += chunk) {
    const slice = yearly.slice(i, i + chunk);
    const { error } = await supabase.from("ndc_indicator_yearly").upsert(slice, { onConflict: "target_id,year" });
    if (error) throw new Error(error.message);
  }

  const { error: e2 } = await supabase.from("ndc_catalog_activities").upsert(ACTIVITIES, { onConflict: "id" });
  if (e2) throw new Error(e2.message);

  const { error: e3 } = await supabase.from("ndc_catalog_mitigation").upsert(MITIGATION, { onConflict: "id" });
  if (e3) throw new Error(e3.message);

  console.log(`\n✓ Upserted indicator meta (${INDICATOR_META.length}), yearly (${yearly.length}), activities (${ACTIVITIES.length}), mitigation (${MITIGATION.length}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
