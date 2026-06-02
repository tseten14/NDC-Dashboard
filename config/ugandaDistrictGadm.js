/**
 * Uganda district → Climate TRACE GADM mapping.
 *
 * Climate TRACE v7 exposes subnational emissions via the `gadmId` query
 * parameter on /v7/sources/emissions. For Uganda, GADM level-1 areas ARE the
 * districts (e.g. "Kampala District" → UGA.16_1). Level-1/2 emissions are only
 * available from 2021 onward (country level goes back to 2015).
 *
 * The list below is the canonical set discovered from
 *   GET /v7/admins/UGA/subdivisions
 * via scripts/discover_uganda_gadm.mjs. The two non-district level-1 areas
 * (Lake Albert, Lake Victoria) are intentionally excluded.
 */

export const UGANDA_NATIONAL_GADM = "UGA";

/** Subnational (district) Climate TRACE coverage begins in 2021. */
export const SUBNATIONAL_INVENTORY_YEAR_MIN = 2021;

/** Canonical districts: clean display name → Climate TRACE GADM level-1 id. */
const DISTRICT_PAIRS = [
  ["Adjumani", "UGA.1_1"],
  ["Apac", "UGA.2_1"],
  ["Arua", "UGA.3_1"],
  ["Bugiri", "UGA.4_1"],
  ["Bundibugyo", "UGA.5_1"],
  ["Bushenyi", "UGA.6_1"],
  ["Busia", "UGA.7_1"],
  ["Gulu", "UGA.8_1"],
  ["Hoima", "UGA.9_1"],
  ["Iganga", "UGA.10_1"],
  ["Jinja", "UGA.11_1"],
  ["Kabale", "UGA.12_1"],
  ["Kabarole", "UGA.13_1"],
  ["Kaberamaido", "UGA.14_1"],
  ["Kalangala", "UGA.15_1"],
  ["Kampala", "UGA.16_1"],
  ["Kamuli", "UGA.17_1"],
  ["Kamwenge", "UGA.18_1"],
  ["Kanungu", "UGA.19_1"],
  ["Kapchorwa", "UGA.20_1"],
  ["Kasese", "UGA.21_1"],
  ["Katakwi", "UGA.22_1"],
  ["Kayunga", "UGA.23_1"],
  ["Kibale", "UGA.24_1"],
  ["Kiboga", "UGA.25_1"],
  ["Kisoro", "UGA.26_1"],
  ["Kitgum", "UGA.27_1"],
  ["Kotido", "UGA.28_1"],
  ["Kumi", "UGA.29_1"],
  ["Kyenjojo", "UGA.30_1"],
  ["Lira", "UGA.33_1"],
  ["Luwero", "UGA.34_1"],
  ["Masaka", "UGA.35_1"],
  ["Masindi", "UGA.36_1"],
  ["Mayuge", "UGA.37_1"],
  ["Mbale", "UGA.38_1"],
  ["Mbarara", "UGA.39_1"],
  ["Moroto", "UGA.40_1"],
  ["Moyo", "UGA.41_1"],
  ["Mpigi", "UGA.42_1"],
  ["Mubende", "UGA.43_1"],
  ["Mukono", "UGA.44_1"],
  ["Nakapiripirit", "UGA.45_1"],
  ["Nakasongola", "UGA.46_1"],
  ["Nebbi", "UGA.47_1"],
  ["Ntungamo", "UGA.48_1"],
  ["Pader", "UGA.49_1"],
  ["Pallisa", "UGA.50_1"],
  ["Rakai", "UGA.51_1"],
  ["Rukungiri", "UGA.52_1"],
  ["Sembabule", "UGA.53_1"],
  ["Sironko", "UGA.54_1"],
  ["Soroti", "UGA.55_1"],
  ["Tororo", "UGA.56_1"],
  ["Wakiso", "UGA.57_1"],
  ["Yumbe", "UGA.58_1"],
];

/**
 * Aliases for alternate spellings or post-2010 districts that were carved out
 * of a GADM parent district. Maps an alternate display label → canonical name.
 */
const DISTRICT_ALIASES = {
  luweero: "Luwero",
  kibaale: "Kibale",
  "fort portal": "Kabarole",
  mityana: "Mubende",
  bududa: "Mbale",
  manafwa: "Mbale",
  entebbe: "Wakiso",
};

export const DISTRICTS = DISTRICT_PAIRS.map(([name, gadm_id]) => ({ name, gadm_id }));

/** Lowercase clean-name → gadm_id. */
export const DISTRICT_GADM_BY_NAME = new Map(
  DISTRICT_PAIRS.map(([name, gadm_id]) => [name.toLowerCase(), gadm_id]),
);

/** gadm_id → clean name. */
const NAME_BY_GADM = new Map(DISTRICT_PAIRS.map(([name, gadm_id]) => [gadm_id, name]));

function normalize(value) {
  return String(value).trim().toLowerCase();
}

/** True for strings shaped like a Uganda GADM level-1 id (e.g. UGA.16_1). */
export function isDistrictGadmId(value) {
  return typeof value === "string" && /^UGA\.\d+_\d+$/.test(value.trim());
}

/**
 * Resolve a district name or GADM id to a canonical Climate TRACE gadm_id.
 * Returns null when the input cannot be mapped to a known district.
 */
export function resolveDistrictGadm(nameOrId) {
  if (nameOrId == null || nameOrId === "") return null;
  const raw = String(nameOrId).trim();
  if (isDistrictGadmId(raw)) {
    return NAME_BY_GADM.has(raw) ? raw : null;
  }
  const key = normalize(raw);
  if (DISTRICT_GADM_BY_NAME.has(key)) return DISTRICT_GADM_BY_NAME.get(key);
  const aliased = DISTRICT_ALIASES[key];
  if (aliased) return DISTRICT_GADM_BY_NAME.get(aliased.toLowerCase()) ?? null;
  return null;
}

/** Canonical district display name for a gadm_id, or null. */
export function getDistrictName(gadmId) {
  return NAME_BY_GADM.get(gadmId) ?? null;
}

/** List of { name, gadm_id } for all mapped districts (alphabetical). */
export function listDistricts() {
  return DISTRICTS.map((d) => ({ ...d }));
}
