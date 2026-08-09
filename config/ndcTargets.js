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

// Detach the inherited properties.
//
// Several endpoints validate a caller-supplied sector by asking whether
// NDC_TARGETS[sector] exists. That reads like an allow-list, but an ordinary
// object also answers to inherited names — "constructor", "toString",
// "valueOf" — so `?sector=constructor` returned a truthy value and slipped past
// the check into code that expected a target definition.
//
// Removing the prototype makes the object answer only for the sectors actually
// defined above, which fixes every one of those checks at once rather than
// leaving each call site to remember. Freezing then stops any later code
// mutating shared configuration at runtime.
Object.setPrototypeOf(NDC_TARGETS, null);
Object.freeze(NDC_TARGETS);

/** The sector keys callers may ask for. */
export const NDC_SECTOR_KEYS = Object.keys(NDC_TARGETS);

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
    "Observed data covers forests and land use; Uganda's full land-sector pledge also includes farms and wetlands, so totals may not match exactly.",
  energy:
    "Observed data covers power, buildings, and fossil fuel use (not transport). NDC goal: about 19% below the expected 2030 level.",
  transport:
    "Observed transport emissions compared to Uganda's 2030 cap of 6.8 million tonnes CO₂e.",
  ippu:
    "Observed industrial and refrigerant emissions compared to Uganda's 2030 cap of 0.86 million tonnes CO₂e.",
  agriculture:
    "Farm emissions are tracked separately; they count toward the broader land-sector goal, not a standalone target.",
  waste:
    "Observed waste emissions compared to Uganda's 2030 cap of 2.1 million tonnes CO₂e.",
};

/** Years requested from Climate TRACE v7 (aligned with defaultInventoryRange). */
export const YEARS = [
  2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
];
