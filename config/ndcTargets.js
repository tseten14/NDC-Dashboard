/**
 * Uganda NDC sector targets and Climate TRACE slug mapping.
 * AFOLU uses forestry + land-use only; agriculture slug maps to agriculture sector (separate from AFOLU).
 */

export const NDC_TARGETS = {
  afolu: {
    label: "AFOLU",
    baseline_year: 2015,
    baseline: 42.5,
    target_year: 2030,
    target: 33.15,
    unit: "MtCO2e",
    condition: "Mixed",
    category: "Emissions Reduction",
  },
  energy: {
    label: "ENERGY",
    baseline_year: 2015,
    baseline: 6.2,
    target_year: 2030,
    target: 3.1,
    unit: "MtCO2e",
    condition: "Unconditional",
    category: "Renewable Energy",
  },
  ippu: {
    label: "IPPU",
    baseline_year: 2015,
    baseline: 1.8,
    target_year: 2030,
    target: 1.2,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  agriculture: {
    label: "AGRICULTURE",
    baseline_year: 2015,
    baseline: 28.4,
    target_year: 2030,
    target: 22.7,
    unit: "MtCO2e",
    condition: "Conditional",
    category: "Emissions Reduction",
  },
  waste: {
    label: "WASTE",
    baseline_year: 2015,
    baseline: 3.8,
    target_year: 2030,
    target: 2.28,
    unit: "MtCO2e",
    condition: "Unconditional",
    category: "Emissions Reduction",
  },
};

/** Climate TRACE API slug → dashboard sector key (avoids double-counting agriculture into AFOLU). */
export const SLUG_TO_UI_SECTOR = {
  "forestry-and-land-use": "afolu",
  agriculture: "agriculture",
  power: "energy",
  transportation: "energy",
  buildings: "energy",
  "fossil-fuel-operations": "energy",
  manufacturing: "ippu",
  waste: "waste",
};

/** Legacy-style map for seed script filters (sector → slugs). */
export const SECTOR_MAP = {
  afolu: ["forestry-and-land-use"],
  energy: ["power", "transportation", "buildings", "fossil-fuel-operations"],
  ippu: ["manufacturing"],
  agriculture: ["agriculture"],
  waste: ["waste"],
};

export const ALL_SECTOR_SLUGS = [
  "forestry-and-land-use",
  "agriculture",
  "power",
  "transportation",
  "buildings",
  "fossil-fuel-operations",
  "manufacturing",
  "waste",
];

/** Years to attempt when seeding (extend if API returns 2024). */
export const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
