/** Static NDC indicator + catalog data (no database). Served via Express /api/v1/*. */
import { MITIGATION_CONCEPTS } from "../shared/mitigationConcepts.js";

// Indicator panel meta — for non-CT-tracked targets (forest cover, electricity capacity,
// CSA adoption, wetlands, electricity access). Transport is now CT-tracked and excluded here.
// Annual rows below are published statistics, retrieved 28 Sep 2026. They are not
// interpolated from the NDC baseline or filled across unpublished years.
const RETRIEVED = "2026-09-28";

export const INDICATOR_META = [
  {
    // t2: Forest cover 12.5% (2020) → 21% (2030) per NDC 2022
    target_id: "t2",
    baseline_year: 2020,
    baseline_value: 12.5,
    target_year: 2030,
    target_value: 21,
    unit: "% land area",
    data_providers: ["FAO via World Bank AG.LND.FRST.ZS"],
    source_type: "observed-eo",
    mrv_owner_ministry: "Ministry of Water and Environment",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: RETRIEVED,
    note: "FAO forest area as a share of land. This is not the same definition as Uganda's NDC forest-cover baseline of 12.5% in 2020.",
  },
  {
    // t3: Electricity generation capacity 1,276.2 MW (2020) → 4,200 MW (2030) per NDC 2022
    target_id: "t3",
    baseline_year: 2020,
    baseline_value: 1276.2,
    target_year: 2030,
    target_value: 4200,
    unit: "MW",
    data_providers: ["UNSD/IRENA electricity capacity statistics"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Energy and Mineral Development",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: RETRIEVED,
    note: "Installed generation capacity. Uganda's NDC states 1,276.2 MW in 2020; this series reports 1,393 MW for that year.",
  },
  {
    // t8: CSA adoption 31.7% (2020) → 70.7% est. (2030) per NDC 2022
    target_id: "t8",
    baseline_year: 2020,
    baseline_value: 31.7,
    target_year: 2030,
    target_value: 70.7,
    unit: "% CSA adoption",
    data_providers: ["MAAIF annual and quarterly performance reports"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Agriculture, Animal Industry and Fisheries",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: RETRIEVED,
    note: "Share of farmers accessing sustainable land management services, the ministry measure behind the NDC's 31.7% baseline. Years are financial years ending in June. The ministry has not published an actual figure after 2020/21.",
  },
  {
    // t9: Wetlands coverage 8.9% (2020) → 12% (2030) per NDC 2022
    target_id: "t9",
    baseline_year: 2020,
    baseline_value: 8.9,
    target_year: 2030,
    target_value: 12,
    unit: "% land area",
    data_providers: ["Ministry of Water and Environment", "MoFPED programme monitoring reports"],
    source_type: "observed-eo",
    mrv_owner_ministry: "Ministry of Water and Environment",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: RETRIEVED,
    note: "Intact wetland cover, the measure behind the NDC's 8.9% baseline. It has not changed since the 2015 national mapping. Total wetland area including degraded wetlands, reported at 13.9% in 2022, is a different measure. Later years are financial years ending in June.",
  },
  {
    // t10: Electricity access 24% (2020) → 75% (2030) per NDC 2022 adaptation target
    target_id: "t10",
    baseline_year: 2020,
    baseline_value: 24,
    target_year: 2030,
    target_value: 75,
    unit: "% electricity access",
    data_providers: ["World Bank EG.ELC.ACCS.ZS"],
    source_type: "reported",
    mrv_owner_ministry: "Ministry of Energy and Mineral Development",
    qaqc_status: "ok",
    is_validated: true,
    last_updated: RETRIEVED,
    note: "World Bank access to electricity, including off-grid. It is higher than the NDC's 24% baseline for 2020.",
  },
];

function indicatorRows(targetId, points) {
  return points.map(([year, value]) => ({ target_id: targetId, year, value }));
}

export const INDICATOR_YEARLY = [
  // FAO forest area (% of land), World Bank AG.LND.FRST.ZS. Retrieved 28 Sep 2026.
  ...indicatorRows("t2", [
    [2015, 12.7], [2016, 12.5], [2017, 12.3], [2018, 12.1], [2019, 11.9],
    [2020, 11.7], [2021, 11.5], [2022, 11.2], [2023, 11.0],
  ]),
  // UNSD/IRENA installed capacity (MW), countryeconomy compilation. Retrieved 28 Sep 2026.
  ...indicatorRows("t3", [
    [2015, 948], [2016, 950], [2017, 1005], [2018, 1105], [2019, 1377],
    [2020, 1393], [2021, 1411], [2022, 1450], [2023, 1839], [2024, 2064],
  ]),
  // Farmers accessing sustainable land management services (%), by financial year
  // ending June: MAAIF Annual Performance Report FY2019/20 (FY2018/19, FY2019/20)
  // and MAAIF Q4 performance report FY2020/21.
  ...indicatorRows("t8", [[2019, 31.7], [2020, 31.7], [2021, 43.9]]),
  // Intact wetland cover (% of land): 2015 national wetland mapping (MWE); FY2020/21
  // (MoFPED BMAU briefing 12/22); FY2021/22 (MWE Programme Performance Report 2022);
  // FY2022/23 (MoFPED NRECCLWM annual monitoring report).
  ...indicatorRows("t9", [[2015, 8.9], [2021, 8.9], [2022, 8.9], [2023, 8.9]]),
  // World Bank EG.ELC.ACCS.ZS, access to electricity (% of population). Retrieved 28 Sep 2026.
  ...indicatorRows("t10", [
    [2015, 18.5], [2016, 26.7], [2017, 32.4], [2018, 41.9], [2019, 41.3],
    [2020, 42.1], [2021, 45.2], [2022, 47.1], [2023, 51.5], [2024, 55.3],
  ]),
];

// NDC measures (Uganda Updated NDC, Sept 2022). Each row's `body` carries only
// fields traceable to the NDC: measure name, description, lead ministry/department,
// implementation level, and districts ONLY where the NDC explicitly names locations
// (Green Cities towns; Greater Kampala BRT). Named focal points/emails and assumed
// per-activity district lists were removed in the June 2026 data audit — they were
// not in the NDC source and could not be verified.
export const CATALOG_ACTIVITIES = [
  { id: "a1",  target_id: "t1",  sort_order: 0, body: { id: "a1",  targetId: "t1",  name: "National Reforestation Programme", description: "Plant 40 million trees (launched March 2021) and scale to 3 billion trees by 2030 across degraded landscapes", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Forestry Sector Support Department", implementationLevel: "national" } },
  { id: "a2",  target_id: "t1",  sort_order: 1, body: { id: "a2",  targetId: "t1",  name: "REDD+ Strategy Implementation", description: "Implement Uganda's National REDD+ Strategy 2017 — reduce deforestation via collaborative forest management and PES", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Climate Change Department", implementationLevel: "national" } },
  { id: "a11", target_id: "t1",  sort_order: 2, body: { id: "a11", targetId: "t1",  name: "Commercial Plantation Scale-Up", description: "Timber/pole/bioenergy woodlot plantations (~10 MtCO₂e combined) to reduce pressure on natural forests", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Forestry Sector Support Department", implementationLevel: "national" } },
  { id: "a3",  target_id: "t2",  sort_order: 0, body: { id: "a3",  targetId: "t2",  name: "Community Forest Restoration", description: "Community-led forest restoration targeting 500,000 ha; 100,000 ha natural forest regeneration", responsibleMinistry: "Ministry of Water and Environment", implementationLevel: "national" } },
  { id: "a12", target_id: "t9",  sort_order: 0, body: { id: "a12", targetId: "t9",  name: "Wetland Demarcation and Restoration", description: "Demarcate, gazette, and restore degraded wetlands via GCF Wetlands Project; peatland restoration in Nile Basin", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Wetlands Management Department", implementationLevel: "national" } },
  { id: "a4",  target_id: "t4",  sort_order: 0, body: { id: "a4",  targetId: "t4",  name: "Renewable Energy Generation Scale-Up", description: "756.8 MW additional hydro + 25 MW bagasse + 20 MW solar + 20 MW wind 2015–2030; reduce T&D losses", responsibleMinistry: "Ministry of Energy and Mineral Development", responsibleDepartment: "Renewable Energy Department", implementationLevel: "national" } },
  { id: "a6",  target_id: "t4",  sort_order: 1, body: { id: "a6",  targetId: "t4",  name: "Energy Efficiency & Fuel Switch Programme", description: "Improved charcoal kilns 12%→75%; industrial efficiency; 50% of schools with improved stoves by 2030", responsibleMinistry: "Ministry of Energy and Mineral Development", responsibleDepartment: "Energy Efficiency Unit", implementationLevel: "national" } },
  { id: "a5",  target_id: "t3",  sort_order: 0, body: { id: "a5",  targetId: "t3",  name: "Rural Electrification Programme", description: "Extend electricity access to 75% of population by 2030; deploy solar/wind-powered systems", responsibleMinistry: "Ministry of Energy and Mineral Development", implementationLevel: "national" } },
  { id: "a7",  target_id: "t5",  sort_order: 0, body: { id: "a7",  targetId: "t5",  name: "GKMA Bus Rapid Transit (BRT)", description: "101 km BRT in Greater Kampala Metropolitan Area by 2030; 200+ e-buses; parking demand management", responsibleMinistry: "Ministry of Works and Transport", responsibleDepartment: "Transport Planning", implementationLevel: "district", districts: ["Kampala", "Wakiso", "Mukono"] } },
  { id: "a13", target_id: "t5",  sort_order: 1, body: { id: "a13", targetId: "t5",  name: "Road Fuel Efficiency & NMT Infrastructure", description: "20% fuel economy improvement by 2030 (GFEI); 100 km NMT corridors in Kampala; 61 km MGR passenger rail rehab", responsibleMinistry: "Ministry of Works and Transport", implementationLevel: "national" } },
  { id: "a8",  target_id: "t6",  sort_order: 0, body: { id: "a8",  targetId: "t6",  name: "Green Cities Waste Management", description: "Solid waste + wastewater management for Kampala, Gulu, Mbarara, Hoima, Mbale and 15 municipalities; reduce, recycle, reuse", responsibleMinistry: "Ministry of Water and Environment", responsibleDepartment: "Environmental Management", implementationLevel: "both", districts: ["Kampala", "Gulu", "Mbarara", "Hoima", "Mbale"] } },
  { id: "a9",  target_id: "t7",  sort_order: 0, body: { id: "a9",  targetId: "t7",  name: "Clinker Substitution in Cement (IPPU)", description: "Substitute clinker with pozzolana/fly-ash/slag in cement; reduces process emissions by 0.10 MtCO₂e/yr", responsibleMinistry: "Ministry of Trade, Industry and Co-operatives", implementationLevel: "national" } },
  { id: "a14", target_id: "t7",  sort_order: 1, body: { id: "a14", targetId: "t7",  name: "HFC Phase-Down / Kigali Amendment", description: "Implement Kigali Amendment to phase down HFC consumption; circular economy management of refrigerants", responsibleMinistry: "Ministry of Water and Environment", implementationLevel: "national" } },
  { id: "a10", target_id: "t8",  sort_order: 0, body: { id: "a10", targetId: "t8",  name: "Climate-Smart Agriculture Rollout", description: "CSA from 31.7%→70.7% of farmers by 2030; irrigation 19,776→152,622 ha; agroforestry; livestock management", responsibleMinistry: "Ministry of Agriculture, Animal Industry and Fisheries", responsibleDepartment: "Crop Production Department", implementationLevel: "national" } },
];

export const CATALOG_MITIGATION = MITIGATION_CONCEPTS.map((body, sort_order) => ({
  id: body.id, target_id: body.targetId, sector_id: body.sectorId, sort_order, body,
}));
