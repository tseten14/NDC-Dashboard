/**
 * Uganda policy document corpus (Climate Policy Radar CSV export, bundled JSON).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPassageEnrichment } from "./policyPassages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "..", "data", "policy/documents.json");
const CURATED_PATH = join(__dirname, "..", "..", "data", "policy/curated.json");

let corpus = null;
let curated = null;
let byId = null;

function loadCorpus() {
  if (corpus) return;
  const raw = readFileSync(DATA_PATH, "utf8");
  const parsed = JSON.parse(raw);
  corpus = parsed.documents ?? [];
  byId = new Map(corpus.map((d) => [d.id, d]));
}

function loadCurated() {
  if (curated) return;
  try {
    curated = JSON.parse(readFileSync(CURATED_PATH, "utf8"));
  } catch {
    curated = { global: [], dashboard: {}, finance: {} };
  }
}

function matchesQuery(doc, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [
    doc.title,
    doc.familyName,
    doc.familySummary,
    doc.documentType,
    doc.category,
    doc.source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(needle);
}

function enrichDoc(doc) {
  const passage = getPassageEnrichment(doc.id);
  if (!passage) return doc;
  return { ...doc, ...passage };
}

/**
 * @param {{ category?: string, source?: string, q?: string, limit?: number, offset?: number }} opts
 */
export function listDocuments(opts = {}) {
  loadCorpus();
  const { category, source, q } = opts;
  const limit = Math.min(Math.max(parseInt(opts.limit ?? "50", 10) || 50, 1), 200);
  const offset = Math.max(parseInt(opts.offset ?? "0", 10) || 0, 0);

  let rows = corpus;
  if (category) rows = rows.filter((d) => d.category === category);
  if (source) rows = rows.filter((d) => d.source === source);
  if (q?.trim()) rows = rows.filter((d) => matchesQuery(d, q.trim()));

  const total = rows.length;
  const documents = rows.slice(offset, offset + limit).map(enrichDoc);

  return {
    documents,
    total,
    limit,
    offset,
    data_source: "climate_policy_radar_export",
    attribution: "Document metadata from Climate Policy Radar export (not a live API).",
  };
}

export function getMeta() {
  loadCorpus();
  const categories = {};
  const sources = {};
  for (const d of corpus) {
    categories[d.category] = (categories[d.category] || 0) + 1;
    if (d.source) sources[d.source] = (sources[d.source] || 0) + 1;
  }
  return {
    count: corpus.length,
    categories,
    sources,
    data_source: "climate_policy_radar_export",
  };
}

/**
 * @param {{ sectorId?: string, context?: string }} opts
 */
export function getCurated(opts = {}) {
  loadCorpus();
  loadCurated();
  const sectorId = opts.sectorId || "AFOLU";
  const context = opts.context || "dashboard";

  let ids = [...(curated.global || [])];
  if (context === "dashboard" && curated.dashboard?.[sectorId]) {
    ids = [...new Set([...ids, ...curated.dashboard[sectorId]])];
  } else if (context === "finance") {
    const financeIds = curated.finance?.[sectorId] ?? curated.finance?.default ?? [];
    ids = [...new Set([...ids, ...financeIds])];
  }

  const documents = ids.map((id) => byId.get(id)).filter(Boolean).map(enrichDoc);
  return {
    sectorId,
    context,
    documents,
    data_source: "climate_policy_radar_export",
  };
}

export function getDocumentById(id) {
  loadCorpus();
  const doc = byId.get(id) ?? null;
  return doc ? enrichDoc(doc) : null;
}
