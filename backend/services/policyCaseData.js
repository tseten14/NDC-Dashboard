import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { policyCaseIndexSchema, policyCaseSchema } from "../../shared/schemas/policyImpact.schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(__dirname, "../../data/policy-cases");

let indexCache = null;
let casesCache = null;

function loadIndex() {
  if (indexCache) return indexCache;
  const raw = readFileSync(join(CASES_DIR, "index.json"), "utf8");
  const parsed = policyCaseIndexSchema.parse(JSON.parse(raw));
  indexCache = parsed;
  return parsed;
}

function loadAllCases() {
  if (casesCache) return casesCache;
  const index = loadIndex();
  const cases = index.cases.map((entry) => {
    const raw = readFileSync(join(CASES_DIR, `${entry.id}.json`), "utf8");
    return policyCaseSchema.parse(JSON.parse(raw));
  });
  casesCache = cases;
  return cases;
}

export function getPolicyCaseIndex() {
  return loadIndex();
}

export function listPolicyCases() {
  const index = loadIndex();
  return {
    ...index,
    data_source: "bundled KCI corpus",
  };
}

export function getPolicyCaseById(id) {
  const cases = loadAllCases();
  return cases.find((c) => c.id === id) ?? null;
}

export function getAllPolicyCases() {
  return loadAllCases();
}

/** Minimal TEF element picker for common intervention types. */
export const TEF_ELEMENTS_BY_SECTOR = {
  AFOLU: [
    { id: "te-ag-credit", label: "Agricultural credit subsidy", intervention_type: "agricultural_credit" },
    { id: "te-ag-efficiency", label: "Farm efficiency programme", intervention_type: "efficiency_programme" },
    { id: "te-reforestation", label: "Reforestation incentive", intervention_type: "reforestation" },
  ],
  Energy: [
    { id: "te-re-invest", label: "Renewable energy investment", intervention_type: "renewable_energy_investment" },
    { id: "te-carbon-price", label: "Carbon pricing", intervention_type: "carbon_pricing" },
    { id: "te-grid-expansion", label: "Grid expansion", intervention_type: "grid_investment" },
  ],
  Transport: [
    { id: "te-ev-shift", label: "Shift to electric vehicles", intervention_type: "ev_transition" },
    { id: "te-fuel-tax", label: "Fuel tax / fiscal measure", intervention_type: "fuel_tax" },
  ],
  "Economy-wide": [
    { id: "te-response", label: "Climate response measures package", intervention_type: "response_measures" },
  ],
};

/** Map dashboard sector ids / labels to TEF catalogue keys. */
const TEF_SECTOR_ALIASES = {
  afolu: "AFOLU",
  agriculture: "AFOLU",
  energy: "Energy",
  transport: "Transport",
  waste: "Economy-wide",
  ippu: "Energy",
  "economy-wide": "Economy-wide",
};

function resolveTefSectorKey(sector) {
  const normalized = sector.trim().toLowerCase();
  if (TEF_SECTOR_ALIASES[normalized]) {
    return TEF_SECTOR_ALIASES[normalized];
  }
  return Object.keys(TEF_ELEMENTS_BY_SECTOR).find(
    (k) => k.toLowerCase() === normalized,
  );
}

export function getTefElements(sector) {
  if (!sector) {
    return Object.values(TEF_ELEMENTS_BY_SECTOR).flat();
  }
  const key = resolveTefSectorKey(sector);
  return key ? TEF_ELEMENTS_BY_SECTOR[key] : [];
}
