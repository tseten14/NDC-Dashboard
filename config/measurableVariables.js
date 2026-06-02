/**
 * Measurable-variable catalog for multi-country NDC tracking.
 *
 * Motivation (Climate TRACE feedback, June 2026): NDC targets across countries
 * are often structurally similar ("reduce emissions from sector X by N% below BAU
 * by year Y"). Rather than hard-coding one country, we describe a country-agnostic
 * catalog of MEASURABLE VARIABLES. Each variable says WHAT is measured and whether
 * Climate TRACE can measure it directly (and from which sector slugs). A country
 * then instantiates a variable with its own parameters (baseline / target / years /
 * conditionality), e.g. Uganda picks 22% for forestry while Kenya might pick 30%.
 *
 * This file is the foundation for that approach. Uganda is expressed on it below;
 * onboarding additional countries means adding entries to COUNTRY_NDC_TARGETS.
 *
 * See ndcTargets.js (NDC_TARGETS[sector].variable_id links each Uganda target here).
 */

import { NDC_TARGETS, SECTOR_MAP } from "./ndcTargets.js";

export const MEASUREMENT_TYPES = {
  /** Reduce sector emissions below a business-as-usual reference (most common NDC form). */
  EMISSIONS_REDUCTION_BELOW_BAU: "emissions_reduction_below_bau",
  /** Absolute sector emissions cap in a target year. */
  ABSOLUTE_EMISSIONS: "absolute_emissions",
  /** A percentage share (e.g. renewable share of energy). */
  SHARE_PCT: "share_pct",
};

/**
 * Country-agnostic catalog. `climate_trace.trackable` indicates whether the
 * variable can be measured directly from Climate TRACE emissions data, and from
 * which sector slugs. Non-trackable variables require national / EO statistics.
 */
export const MEASURABLE_VARIABLES = {
  forestry_landuse_emissions: {
    id: "forestry_landuse_emissions",
    label: "Forestry & land-use emissions",
    description: "Emissions from the forestry and land-use sector (afforestation, reforestation, reduced deforestation).",
    measurement_type: MEASUREMENT_TYPES.EMISSIONS_REDUCTION_BELOW_BAU,
    unit: "MtCO2e",
    climate_trace: { trackable: true, sector_slugs: ["forestry-and-land-use"], gas: "co2e_100yr" },
  },
  agriculture_emissions: {
    id: "agriculture_emissions",
    label: "Agriculture emissions",
    description: "Emissions from the agriculture sector (enteric fermentation, soils, manure, rice).",
    measurement_type: MEASUREMENT_TYPES.EMISSIONS_REDUCTION_BELOW_BAU,
    unit: "MtCO2e",
    climate_trace: { trackable: true, sector_slugs: ["agriculture"], gas: "co2e_100yr" },
  },
  energy_emissions: {
    id: "energy_emissions",
    label: "Energy emissions",
    description: "Combined power, transportation, buildings, and fossil-fuel-operations emissions.",
    measurement_type: MEASUREMENT_TYPES.EMISSIONS_REDUCTION_BELOW_BAU,
    unit: "MtCO2e",
    climate_trace: {
      trackable: true,
      sector_slugs: ["power", "transportation", "buildings", "fossil-fuel-operations"],
      gas: "co2e_100yr",
    },
  },
  ippu_emissions: {
    id: "ippu_emissions",
    label: "IPPU emissions",
    description: "Industrial processes and product use (manufacturing + fluorinated gases).",
    measurement_type: MEASUREMENT_TYPES.EMISSIONS_REDUCTION_BELOW_BAU,
    unit: "MtCO2e",
    climate_trace: { trackable: true, sector_slugs: ["manufacturing", "fluorinated-gases"], gas: "co2e_100yr" },
  },
  waste_emissions: {
    id: "waste_emissions",
    label: "Waste emissions",
    description: "Emissions from solid waste and wastewater treatment.",
    measurement_type: MEASUREMENT_TYPES.EMISSIONS_REDUCTION_BELOW_BAU,
    unit: "MtCO2e",
    climate_trace: { trackable: true, sector_slugs: ["waste"], gas: "co2e_100yr" },
  },

  // --- Variables Climate TRACE cannot measure directly (need national/EO statistics) ---
  renewable_energy_share: {
    id: "renewable_energy_share",
    label: "Renewable energy share",
    description: "Renewable share of energy generation/consumption.",
    measurement_type: MEASUREMENT_TYPES.SHARE_PCT,
    unit: "%",
    climate_trace: {
      trackable: false,
      sector_slugs: [],
      note: "Climate TRACE measures emissions, not capacity/generation share. Needs national energy statistics.",
    },
  },
  forest_cover_pct: {
    id: "forest_cover_pct",
    label: "Forest cover (% land area)",
    description: "Share of land area under forest cover.",
    measurement_type: MEASUREMENT_TYPES.SHARE_PCT,
    unit: "%",
    climate_trace: {
      trackable: false,
      sector_slugs: [],
      note: "Forest extent indicator; derive from EO / national forestry authority, not a direct CT emissions variable.",
    },
  },
  transport_modal_shift_pct: {
    id: "transport_modal_shift_pct",
    label: "Transport modal shift",
    description: "Shift of passenger/freight transport to lower-carbon modes.",
    measurement_type: MEASUREMENT_TYPES.SHARE_PCT,
    unit: "%",
    climate_trace: { trackable: false, sector_slugs: [], note: "Needs transport ministry MRV statistics." },
  },
  csa_adoption_pct: {
    id: "csa_adoption_pct",
    label: "Climate-smart agriculture adoption",
    description: "Adoption rate of climate-smart agriculture practices.",
    measurement_type: MEASUREMENT_TYPES.SHARE_PCT,
    unit: "%",
    climate_trace: { trackable: false, sector_slugs: [], note: "Needs agriculture ministry programme data." },
  },
};

/** Dashboard UI sector key -> measurable variable id (mirrors SECTOR_MAP grouping). */
export const SECTOR_TO_VARIABLE = {
  afolu: "forestry_landuse_emissions",
  agriculture: "agriculture_emissions",
  energy: "energy_emissions",
  ippu: "ippu_emissions",
  waste: "waste_emissions",
};

export function getMeasurableVariable(id) {
  return MEASURABLE_VARIABLES[id] ?? null;
}

/** Variables Climate TRACE can measure directly today. */
export function listTrackableVariables() {
  return Object.values(MEASURABLE_VARIABLES).filter((v) => v.climate_trace?.trackable);
}

/** True when the given UI sector maps to a Climate-TRACE-trackable variable. */
export function isTraceTrackable(sectorKey) {
  const variableId = SECTOR_TO_VARIABLE[sectorKey];
  return Boolean(variableId && MEASURABLE_VARIABLES[variableId]?.climate_trace?.trackable);
}

/**
 * Build a country NDC instance: bind each sector target to its measurable
 * variable and record Climate TRACE trackability + sector slugs. `targetsBySector`
 * defaults to Uganda's NDC_TARGETS; other countries pass their own equivalent map.
 */
export function buildCountryTargets({ country, countryName, gadmId, targetsBySector = NDC_TARGETS }) {
  const targets = {};
  for (const [sector, t] of Object.entries(targetsBySector)) {
    const variableId = t.variable_id ?? SECTOR_TO_VARIABLE[sector] ?? null;
    const variable = variableId ? MEASURABLE_VARIABLES[variableId] : null;
    targets[sector] = {
      sector,
      variable_id: variableId,
      label: t.label,
      baseline_year: t.baseline_year,
      baseline: t.baseline,
      target_year: t.target_year,
      target: t.target,
      unit: t.unit,
      condition: t.condition,
      reduction_pct:
        t.baseline != null && t.target != null && t.baseline !== 0
          ? +(((t.baseline - t.target) / t.baseline) * 100).toFixed(1)
          : null,
      climate_trace_trackable: Boolean(variable?.climate_trace?.trackable),
      climate_trace_slugs: variable?.climate_trace?.sector_slugs ?? SECTOR_MAP[sector] ?? [],
    };
  }
  return { country, country_name: countryName, gadm_id: gadmId, targets };
}

/**
 * Registry of country NDC instances. Uganda is fully expressed; additional
 * countries are added here once their per-sector NDC parameters are available.
 */
export const COUNTRY_NDC_TARGETS = {
  UGA: buildCountryTargets({ country: "UGA", countryName: "Uganda", gadmId: "UGA" }),
};
