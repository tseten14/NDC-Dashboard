/** Static NDC indicator + catalog data (no database). Served via Express /api/v1/*. */

function histRows(targetId, baseline, start, end, deltaPerYear) {
  const rows = [];
  for (let y = start; y <= end; y++) {
    const v = Math.round((baseline + deltaPerYear * (y - start)) * 100) / 100;
    rows.push({ target_id: targetId, year: y, value: v });
  }
  return rows;
}

// Indicator panel meta — for non-CT-tracked targets (forest cover, electricity capacity,
// CSA adoption, wetlands, electricity access). Transport is now CT-tracked and excluded here.
export const INDICATOR_META = [
  {
    // t2: Forest cover 12.5% (2020) → 21% (2030) per NDC 2022
    target_id: "t2",
    baseline_year: 2020,
    baseline_value: 12.5,
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
    // t3: Electricity generation capacity 1,276.2 MW (2020) → 4,200 MW (2030) per NDC 2022
    target_id: "t3",
    baseline_year: 2020,
    baseline_value: 1276.2,
    target_year: 2030,
    target_value: 4200,
    unit: "MW",
    data_providers: ["Uganda Electricity Regulatory Authority", "Ministry MRV"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Energy and Mineral Development",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: "2024-09-01T10:00:00Z",
  },
  {
    // t8: CSA adoption 31.7% (2020) → 70.7% est. (2030) per NDC 2022
    target_id: "t8",
    baseline_year: 2020,
    baseline_value: 31.7,
    target_year: 2030,
    target_value: 70.7,
    unit: "% CSA adoption",
    data_providers: ["Ministry MRV", "FAO"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Agriculture, Animal Industry and Fisheries",
    qaqc_status: "warning",
    is_validated: false,
    last_updated: "2024-06-01T08:00:00Z",
  },
  {
    // t9: Wetlands coverage 8.9% (2020) → 12% (2030) per NDC 2022
    target_id: "t9",
    baseline_year: 2020,
    baseline_value: 8.9,
    target_year: 2030,
    target_value: 12,
    unit: "% land area",
    data_providers: ["National Wetlands Atlas", "Ministry of Water and Environment"],
    source_type: "observed-eo",
    mrv_owner_ministry: "Ministry of Water and Environment",
    qaqc_status: "missing",
    is_validated: false,
    last_updated: "2023-12-01T00:00:00Z",
  },
  {
    // t10: Electricity access 24% (2020) → 75% (2030) per NDC 2022 adaptation target
    target_id: "t10",
    baseline_year: 2020,
    baseline_value: 24,
    target_year: 2030,
    target_value: 75,
    unit: "% electricity access",
    data_providers: ["Uganda Bureau of Statistics", "Uganda Electricity Regulatory Authority"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Energy and Mineral Development",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: "2024-09-01T10:00:00Z",
  },
];

export const INDICATOR_YEARLY = [
  ...histRows("t2",  12.5, 2020, 2024, 0.6),
  ...histRows("t3",  1276.2, 2020, 2024, 180),
  ...histRows("t8",  31.7, 2020, 2024, 2.0),
  ...histRows("t9",  8.9, 2020, 2024, 0.12),
  ...histRows("t10", 24, 2020, 2024, 4.0),
];

export const CATALOG_ACTIVITIES = [
  { id: "a1",  target_id: "t1",  sort_order: 0, body: { id: "a1",  targetId: "t1",  name: "National Reforestation Programme", description: "Plant 40 million trees (launched March 2021) and scale to 3 billion trees by 2030 across degraded landscapes", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Forestry Sector Support Department", focalPoint: { name: "Dr. Sarah Namirembe", role: "Director, Forestry", email: "s.namirembe@mwe.go.ug" }, implementationLevel: "both", districts: ["Kampala", "Wakiso", "Mukono", "Mbarara", "Gulu", "Lira"] } },
  { id: "a2",  target_id: "t1",  sort_order: 1, body: { id: "a2",  targetId: "t1",  name: "REDD+ Strategy Implementation", description: "Implement Uganda's National REDD+ Strategy 2017 — reduce deforestation via collaborative forest management and PES", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Climate Change Department", focalPoint: { name: "Mr. Bob Natifu", role: "Commissioner, Climate Change", email: "b.natifu@mwe.go.ug" }, implementationLevel: "national" } },
  { id: "a11", target_id: "t1",  sort_order: 2, body: { id: "a11", targetId: "t1",  name: "Commercial Plantation Scale-Up", description: "Timber/pole/bioenergy woodlot plantations (~10 MtCO₂e combined) to reduce pressure on natural forests", responsibleMinistry: "Ministry of Water and Environment", focalPoint: { name: "Dr. Sarah Namirembe", role: "Director, Forestry", email: "s.namirembe@mwe.go.ug" }, implementationLevel: "national" } },
  { id: "a3",  target_id: "t2",  sort_order: 0, body: { id: "a3",  targetId: "t2",  name: "Community Forest Restoration", description: "Community-led forest restoration targeting 500,000 ha; 100,000 ha natural forest regeneration", responsibleMinistry: "Ministry of Water and Environment", focalPoint: { name: "Ms. Grace Akello", role: "Senior Forest Officer", email: "g.akello@mwe.go.ug" }, implementationLevel: "district", districts: ["Hoima", "Masindi", "Kibaale", "Kyenjojo", "Bundibugyo"] } },
  { id: "a12", target_id: "t9",  sort_order: 0, body: { id: "a12", targetId: "t9",  name: "Wetland Demarcation and Restoration", description: "Demarcate, gazette, and restore degraded wetlands via GCF Wetlands Project; peatland restoration in Nile Basin", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Wetlands Management Department", focalPoint: { name: "Dr. Alice Nabwire", role: "Commissioner, Wetlands", email: "a.nabwire@mwe.go.ug" }, implementationLevel: "national" } },
  { id: "a4",  target_id: "t4",  sort_order: 0, body: { id: "a4",  targetId: "t4",  name: "Renewable Energy Generation Scale-Up", description: "756.8 MW additional hydro + 25 MW bagasse + 20 MW solar + 20 MW wind 2015–2030; reduce T&D losses", responsibleMinistry: "Ministry of Energy and Mineral Development", responsibleDepartment: "Renewable Energy Department", focalPoint: { name: "Eng. Peter Okwoko", role: "Director, Renewable Energy", email: "p.okwoko@memd.go.ug" }, implementationLevel: "national" } },
  { id: "a6",  target_id: "t4",  sort_order: 1, body: { id: "a6",  targetId: "t4",  name: "Energy Efficiency & Fuel Switch Programme", description: "Improved charcoal kilns 12%→75%; industrial efficiency; 50% of schools with improved stoves by 2030", responsibleMinistry: "Ministry of Energy and Mineral Development", responsibleDepartment: "Energy Efficiency Unit", focalPoint: { name: "Dr. James Opio", role: "Head of Standards", email: "j.opio@memd.go.ug" }, implementationLevel: "national" } },
  { id: "a5",  target_id: "t3",  sort_order: 0, body: { id: "a5",  targetId: "t3",  name: "Rural Electrification Programme", description: "Extend electricity access to 75% of population by 2030; deploy solar/wind-powered systems", responsibleMinistry: "Ministry of Energy and Mineral Development", focalPoint: { name: "Ms. Irene Muloni", role: "Commissioner, Energy", email: "i.muloni@memd.go.ug" }, implementationLevel: "both", districts: ["Soroti", "Arua", "Gulu", "Lira", "Moroto", "Kotido"] } },
  { id: "a7",  target_id: "t5",  sort_order: 0, body: { id: "a7",  targetId: "t5",  name: "GKMA Bus Rapid Transit (BRT)", description: "101 km BRT in Greater Kampala Metropolitan Area by 2030; 200+ e-buses; parking demand management", responsibleMinistry: "Ministry of Works and Transport", responsibleDepartment: "Transport Planning", focalPoint: { name: "Eng. David Luyimbazi", role: "Director, Transport", email: "d.luyimbazi@mowt.go.ug" }, implementationLevel: "district", districts: ["Kampala", "Wakiso", "Mukono"] } },
  { id: "a13", target_id: "t5",  sort_order: 1, body: { id: "a13", targetId: "t5",  name: "Road Fuel Efficiency & NMT Infrastructure", description: "20% fuel economy improvement by 2030 (GFEI); 100 km NMT corridors in Kampala; 61 km MGR passenger rail rehab", responsibleMinistry: "Ministry of Works and Transport", focalPoint: { name: "Eng. David Luyimbazi", role: "Director, Transport", email: "d.luyimbazi@mowt.go.ug" }, implementationLevel: "national" } },
  { id: "a8",  target_id: "t6",  sort_order: 0, body: { id: "a8",  targetId: "t6",  name: "Green Cities Waste Management", description: "Solid waste + wastewater management for Kampala, Gulu, Mbarara, Hoima, Mbale and 15 municipalities; reduce, recycle, reuse", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Environmental Management", focalPoint: { name: "Dr. Mary Goretti", role: "Environmental Inspector", email: "m.goretti@mwe.go.ug" }, implementationLevel: "both", districts: ["Kampala", "Gulu", "Mbarara", "Hoima", "Mbale"] } },
  { id: "a9",  target_id: "t7",  sort_order: 0, body: { id: "a9",  targetId: "t7",  name: "Clinker Substitution in Cement (IPPU)", description: "Substitute clinker with pozzolana/fly-ash/slag in cement; reduces process emissions by 0.10 MtCO₂e/yr", responsibleMinistry: "Ministry of Trade, Industry and Co-operatives", focalPoint: { name: "Mr. Arnold Waiswa", role: "Industrial Standards Officer", email: "a.waiswa@mtic.go.ug" }, implementationLevel: "national" } },
  { id: "a14", target_id: "t7",  sort_order: 1, body: { id: "a14", targetId: "t7",  name: "HFC Phase-Down / Kigali Amendment", description: "Implement Kigali Amendment to phase down HFC consumption; circular economy management of refrigerants", responsibleMinistry: "Ministry of Water and Environment", focalPoint: { name: "Mr. Arnold Waiswa", role: "Ozone Officer", email: "a.waiswa@mwe.go.ug" }, implementationLevel: "national" } },
  { id: "a10", target_id: "t8",  sort_order: 0, body: { id: "a10", targetId: "t8",  name: "Climate-Smart Agriculture Rollout", description: "CSA from 31.7%→70.7% of farmers by 2030; irrigation 19,776→152,622 ha; agroforestry; livestock management", responsibleMinistry: "Ministry of Agriculture, Animal Industry and Fisheries", responsibleDepartment: "Crop Production Department", focalPoint: { name: "Dr. Joseph Bazaale", role: "Director, Crop Resources", email: "j.bazaale@maaif.go.ug" }, implementationLevel: "both", districts: ["Masaka", "Rakai", "Sembabule", "Pallisa", "Kumi", "Katakwi"] } },
];

export const CATALOG_MITIGATION = [
  { id: "m1", target_id: "t1", sector_id: "afolu",       sort_order: 0, body: { id: "m1", targetId: "t1", sectorId: "afolu",       title: "Payment for Ecosystem Services (PES)",           description: "PES schemes to incentivize forest conservation; target 500,000 ha", emissionsReductionPotential: 2.5,  emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 15,  costCurrency: "USD", costMagnitude: "million/yr", confidence: "medium", bestPractices: [{ country: "Costa Rica", title: "National PES Programme",   description: "Payments to landowners for forest conservation since 1997",              outcome: "Forest cover increased from 21% to 52%" }] } },
  { id: "m2", target_id: "t1", sector_id: "afolu",       sort_order: 1, body: { id: "m2", targetId: "t1", sectorId: "afolu",       title: "Commercial Plantation Expansion",                description: "Timber/pole/bioenergy woodlot plantations on degraded lands (~10 MtCO₂e)", emissionsReductionPotential: 3.8,  emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 45,  costCurrency: "USD", costMagnitude: "million",    confidence: "high",   bestPractices: [{ country: "Ethiopia", title: "Green Legacy Initiative",   description: "Planted 5 billion trees in 2019-2020",                                  outcome: "Significant reforestation of degraded highlands" }] } },
  { id: "m8", target_id: "t1", sector_id: "afolu",       sort_order: 2, body: { id: "m8", targetId: "t1", sectorId: "afolu",       title: "Improved Charcoal Kilns",                        description: "Scale charcoal kiln efficiency 12%→75% by 2030; ~3.37 MtCO₂e reduction", emissionsReductionPotential: 3.37, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 20,  costCurrency: "USD", costMagnitude: "million",    confidence: "medium", bestPractices: [{ country: "Kenya",    title: "Kenya Charcoal Programme", description: "Promotion of retort and pyrolysis kilns",                               outcome: "45% improvement in charcoal conversion efficiency" }] } },
  { id: "m3", target_id: "t4", sector_id: "energy",      sort_order: 0, body: { id: "m3", targetId: "t4", sectorId: "energy",      title: "Mini-Grid Solar Deployment",                     description: "Deploy 200 solar mini-grids in off-grid rural areas",                    emissionsReductionPotential: 0.8,  emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 120, costCurrency: "USD", costMagnitude: "million",    confidence: "high",   bestPractices: [{ country: "Tanzania", title: "Rural Energy Agency Mini-Grids", description: "Deployed 200+ mini-grids serving 300,000 customers",                  outcome: "60% reduction in kerosene usage" }] } },
  { id: "m4", target_id: "t4", sector_id: "energy",      sort_order: 1, body: { id: "m4", targetId: "t4", sectorId: "energy",      title: "Improved Cookstove Distribution",                description: "Distribute 65,000 improved cookstoves/yr + cooking fuel switch to electricity", emissionsReductionPotential: 1.09, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 25,  costCurrency: "USD", costMagnitude: "million",    confidence: "medium", bestPractices: [{ country: "Rwanda",   title: "National Cookstove Programme", description: "Distributed 1.5M improved stoves to households",                      outcome: "40% reduction in firewood consumption" }] } },
  { id: "m5", target_id: "t5", sector_id: "transport",   sort_order: 0, body: { id: "m5", targetId: "t5", sectorId: "transport",   title: "E-Buses & BRT (GKMA)",                           description: "200+ e-buses + 101 km BRT in Greater Kampala Metropolitan Area",           emissionsReductionPotential: 0.54, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 200, costCurrency: "USD", costMagnitude: "million",    confidence: "low",    bestPractices: [{ country: "Kenya",    title: "BasiGo Electric Buses",     description: "Electric bus deployment in Nairobi",                                    outcome: "70% operating cost reduction vs diesel" }] } },
  { id: "m9", target_id: "t5", sector_id: "transport",   sort_order: 1, body: { id: "m9", targetId: "t5", sectorId: "transport",   title: "Road Fuel Efficiency Standards",                 description: "GFEI 50by50: 20% fuel economy improvement by 2030; ~1.86 MtCO₂e reduction", emissionsReductionPotential: 1.86, emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 10,  costCurrency: "USD", costMagnitude: "million",    confidence: "medium", bestPractices: [{ country: "Morocco",  title: "Vehicle Standards Regulation", description: "Mandatory fuel economy standards for imported vehicles",              outcome: "15% fleet efficiency improvement in 5 years" }] } },
  { id: "m6", target_id: "t6", sector_id: "waste",       sort_order: 0, body: { id: "m6", targetId: "t6", sectorId: "waste",       title: "Green Cities Waste Management",                  description: "Solid waste + wastewater management for 5 cities and 15 municipalities",  emissionsReductionPotential: 1.1,  emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 80,  costCurrency: "USD", costMagnitude: "million",    confidence: "medium", bestPractices: [{ country: "South Africa", title: "Durban Landfill Gas-to-Energy", description: "Largest CDM landfill gas project in Africa",                          outcome: "Generates 7.5 MW and reduces 340ktCO₂e/yr" }] } },
  { id: "m7", target_id: "t8", sector_id: "agriculture", sort_order: 0, body: { id: "m7", targetId: "t8", sectorId: "agriculture", title: "Agroforestry Integration Programme",              description: "Promote agroforestry across 1.3M ha of farmland by 2030 (Aichi Target 15)", emissionsReductionPotential: 1.5,  emissionsReductionUnit: "MtCO₂e/yr", costEstimate: 35,  costCurrency: "USD", costMagnitude: "million",    confidence: "high",   bestPractices: [{ country: "Malawi",   title: "National Agroforestry Programme", description: "Integrated trees on 300,000 ha of farmland",                         outcome: "25% yield increase plus carbon sequestration" }] } },
];
