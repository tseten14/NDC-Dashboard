/**
 * Uganda NDC sector targets and Climate TRACE slug mapping.
 * Updated to Uganda Updated NDC, September 2022.
 *
 * All sector targets are expressed as NDC 2022 BAU-relative: the 2030 NDC
 * absolute target is compared against the 2015 actual (base year per NDC Annex 1).
 * For growing-emission sectors the 2030 target exceeds the 2015 baseline, so the
 * progress % measures "how close to the NDC ceiling" rather than "how much
 * reduction has been achieved" — see SECTOR_SCOPE_NOTES for context.
 */

/**
 * Uganda's sector targets (NDC 2022).
 * `variable_id` links each target to config/measurableVariables.js.
 */
export const NDC_TARGETS = {
  afolu: {
    label: "AFOLU",
    variable_id: "forestry_landuse_emissions",
    baseline_year: 2015,
    baseline: 77.6,   // 2015 AFOLU national inventory (forestry+land+agriculture+wetlands)
    target_year: 2030,
    target: 91.8,     // NDC 2030 conditional target: 24.9% below BAU of 122.2 MtCO2e
    bau_2030: 122.2,
    reduction_below_bau_pct: 24.9,
    unit: "MtCO2e",
    condition: "Mixed",
    category: "Emissions Reduction",
  },
  energy: {
    label: "ENERGY",
    variable_id: "energy_emissions",
    baseline_year: 2015,
    baseline: 5.66,   // 2015 energy stationary (excl. transport), national inventory
    target_year: 2030,
    target: 10.10,    // NDC 2030 target: 18.8% below BAU of 12.44 MtCO2e
    bau_2030: 12.44,
    reduction_below_bau_pct: 18.8,
    unit: "MtCO2e",
    condition: "Mixed",
    category: "Emissions Reduction",
  },
  transport: {
    label: "TRANSPORT",
    variable_id: "transport_emissions",
    baseline_year: 2015,
    baseline: 4.2,    // 2015 transport, national inventory
    target_year: 2030,
    target: 6.8,      // NDC 2030 target: 29% below BAU of 9.6 MtCO2e
    bau_2030: 9.6,
    reduction_below_bau_pct: 29,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  waste: {
    label: "WASTE",
    variable_id: "waste_emissions",
    baseline_year: 2015,
    baseline: 2.08,   // 2015 waste, national inventory
    target_year: 2030,
    target: 2.09,     // NDC 2030 target: 34.8% below BAU of 3.19 MtCO2e
    bau_2030: 3.19,
    reduction_below_bau_pct: 34.8,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  ippu: {
    label: "IPPU",
    variable_id: "ippu_emissions",
    baseline_year: 2015,
    baseline: 0.57,   // 2015 IPPU, national inventory
    target_year: 2030,
    target: 0.86,     // NDC 2030 target: 14% below BAU of 1.0 MtCO2e
    bau_2030: 1.0,
    reduction_below_bau_pct: 14,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  agriculture: {
    // Climate TRACE-tracked component of the NDC AFOLU sector.
    // The NDC 2022 has no standalone agriculture mitigation target; agriculture
    // measures (agroforestry, livestock, irrigation) are part of the AFOLU sector.
    label: "AGRICULTURE",
    variable_id: "agriculture_emissions",
    baseline_year: 2015,
    baseline: 28.4,   // estimated 2015 agriculture (part of AFOLU total)
    target_year: 2030,
    target: 22.7,     // component of AFOLU NDC target; no standalone NDC 2022 figure
    unit: "MtCO2e",
    condition: "Mixed",
    category: "Emissions Reduction",
  },
};

/** Climate TRACE API slug → dashboard sector key. */
export const SLUG_TO_UI_SECTOR = {
  "forestry-and-land-use": "afolu",
  agriculture: "agriculture",
  power: "energy",
  transportation: "transport",       // now its own sector per NDC 2022
  buildings: "energy",
  "fossil-fuel-operations": "energy",
  manufacturing: "ippu",
  "fluorinated-gases": "ippu",
  waste: "waste",
};

/** Legacy-style map for seed script filters (sector → slugs). */
export const SECTOR_MAP = {
  afolu: ["forestry-and-land-use"],
  energy: ["power", "buildings", "fossil-fuel-operations"], // transport split out
  transport: ["transportation"],
  ippu: ["manufacturing", "fluorinated-gases"],
  agriculture: ["agriculture"],
  waste: ["waste"],
};

/** Slugs mapped to dashboard sectors (excludes mineral-extraction — reported separately). */
export const ALL_SECTOR_SLUGS = [
  "forestry-and-land-use",
  "agriculture",
  "power",
  "transportation",
  "buildings",
  "fossil-fuel-operations",
  "manufacturing",
  "fluorinated-gases",
  "waste",
];

/** Climate TRACE slug not in any NDC UI bucket; included in country reconciliation only. */
export const UNMAPPED_SECTOR_SLUGS = ["mineral-extraction"];

/** All slugs used for country total reconciliation (mapped + unmapped). */
export const ALL_TRACE_SLUGS = [...ALL_SECTOR_SLUGS, ...UNMAPPED_SECTOR_SLUGS];

/** Per-dashboard-sector scope notes for UI / API provenance. */
export const SECTOR_SCOPE_NOTES = {
  afolu:
    "Climate TRACE forestry-and-land-use slug vs full NDC AFOLU target (which covers forestry + agriculture + land use + wetlands/peatlands in the national inventory). CT scale differs from NDC national inventory; Agriculture slug tracked separately.",
  energy:
    "Climate TRACE power + buildings + fossil-fuel-operations (energy stationary, excl. transport per NDC 2022). NDC target: 18.8% below 2030 BAU of 12.44 MtCO2e.",
  transport:
    "Climate TRACE transportation slug. NDC 2022 target: 29% below 2030 BAU of 9.6 MtCO2e → 6.8 MtCO2e. Key measures: road fuel efficiency, BRT, NMT corridors, rail rehabilitation.",
  ippu:
    "Climate TRACE manufacturing + fluorinated-gases slugs. NDC 2022 target: 14% below 2030 BAU of 1.0 MtCO2e → 0.86 MtCO2e. Main measure: clinker substitution in cement.",
  agriculture:
    "Climate TRACE agriculture slug (enteric fermentation, soils, manure). Part of NDC AFOLU sector — no standalone mitigation target in NDC 2022.",
  waste:
    "Climate TRACE waste slug. NDC 2022 target: 34.8% below 2030 BAU of 3.19 MtCO2e → 2.09 MtCO2e.",
};

/** Years requested from Climate TRACE v7 (aligned with defaultInventoryRange). */
export const YEARS = [
  2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];
