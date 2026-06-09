import type { NDCTarget } from "@/data/uganda-ndc-data";

export interface TargetPlainLanguage {
  /** One or two short sentences for the target card. */
  summary: string;
  /** Optional action bullets (shown when expanded). */
  measures?: string[];
}

const PLAIN_BY_TARGET_ID: Record<string, TargetPlainLanguage> = {
  t0: {
    summary:
      "Uganda aims to keep total national emissions about 25% below the ‘business as usual’ path by 2030 — roughly 112 million tonnes CO₂e if international support is secured.",
    measures: [
      "5.9% cut funded domestically; larger share needs climate finance",
      "Base year 2015; goal set against 2030 ‘no extra policy’ trend",
    ],
  },
  t1: {
    summary:
      "Cut emissions from forests, farms, and land use by about a quarter by 2030 — stay at or below 92 million tonnes CO₂e. This sector carries most of Uganda’s climate effort.",
    measures: [
      "Protect forests and restore degraded land",
      "Climate-smart farming and commercial tree planting",
      "Cleaner cookstoves and better livestock practices",
      "Restore wetlands and peatlands",
    ],
  },
  t2: {
    summary: "Grow forest cover from 12.5% of the country (2020) to 21% by 2030 through planting and restoration.",
    measures: ["Afforestation and reforestation", "Landscape restoration (Bonn Challenge: 2.5 million ha)"],
  },
  t9: {
    summary: "Increase protected wetland area from 8.9% (2020) to 12% of land by 2030.",
    measures: ["Map and protect wetlands", "Restore degraded wetland areas"],
  },
  t4: {
    summary:
      "Cap stationary energy emissions at about 10 million tonnes CO₂e by 2030 — roughly 19% below the expected ‘no policy’ level.",
    measures: [
      "More hydro, solar, and wind power",
      "Efficient charcoal production and cookstoves",
      "Industrial energy savings and cleaner fuels",
    ],
  },
  t3: {
    summary:
      "Expand power generation from about 1,300 MW (2020) to 4,200 MW by 2030, and connect far more households to the grid.",
    measures: ["75% of people with electricity access by 2030", "65% clean cooking fuels by 2030"],
  },
  t5: {
    summary:
      "Limit transport emissions to 6.8 million tonnes CO₂e by 2030 — about 29% below the expected trend.",
    measures: [
      "More efficient vehicles and cleaner fuels",
      "Electric buses and bus rapid transit in Greater Kampala",
      "Walking and cycling corridors; rail upgrades",
    ],
  },
  t6: {
    summary:
      "Limit waste-sector emissions to 2.1 million tonnes CO₂e by 2030 — about 35% below the expected trend.",
    measures: [
      "Better waste collection and recycling in major cities",
      "Wastewater treatment and school sanitation programmes",
    ],
  },
  t7: {
    summary:
      "Limit industrial-process emissions to 0.86 million tonnes CO₂e by 2030 — about 14% below the expected trend.",
    measures: ["Greener cement production", "Safer handling of refrigerants"],
  },
  t8: {
    summary:
      "Raise the share of farmers using climate-smart practices from 32% (2020) to about 71% by 2030, and expand irrigated farmland.",
    measures: ["Climate-smart agriculture and agroforestry", "More area under irrigation"],
  },
  t10: {
    summary:
      "Connect 75% of households to electricity by 2030 (from 24% in 2020) and shift cooking to cleaner fuels.",
    measures: ["Grid and off-grid electricity access", "Reduce reliance on firewood and charcoal for cooking"],
  },
};

/** Fallback: first sentence of official NDC text, trimmed. */
function fallbackFromOfficial(target: NDCTarget): TargetPlainLanguage {
  const first = target.targetText.split(/(?<=[.!])\s+/)[0] ?? target.targetText;
  const summary = first.length > 180 ? `${first.slice(0, 177)}…` : first;
  return { summary };
}

export function getTargetPlainLanguage(target: NDCTarget): TargetPlainLanguage {
  return PLAIN_BY_TARGET_ID[target.id] ?? fallbackFromOfficial(target);
}
