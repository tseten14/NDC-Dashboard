/**
 * CPR passage corpus — documents, passages, topics (bundled JSON export).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_PATH = join(__dirname, "..", "..", "data", "policy/passage-documents.json");
const PASSAGES_PATH = join(__dirname, "..", "..", "data", "policy/passages.json");
const TOPICS_PATH = join(__dirname, "..", "..", "data", "policy/topics-index.json");
const CATALOG_PATH = join(__dirname, "..", "..", "data", "policy/documents.json");

const ATTRIBUTION =
  "Passage topics and summaries from Climate Policy Radar export (not a live API).";
const DATA_SOURCE = "climate_policy_radar_passage_export";

let passageDocs = null;
let passages = null;
let topics = null;
let byCprDocumentId = null;
let byCatalogId = null;
let passagesByDoc = null;
let catalogById = null;

function loadCatalog() {
  if (catalogById) return;
  const raw = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  catalogById = new Map((raw.documents ?? []).map((d) => [d.id, d]));
}

function load() {
  if (passageDocs) return;

  const docsRaw = JSON.parse(readFileSync(DOCS_PATH, "utf8"));
  const passagesRaw = JSON.parse(readFileSync(PASSAGES_PATH, "utf8"));
  const topicsRaw = JSON.parse(readFileSync(TOPICS_PATH, "utf8"));

  passageDocs = docsRaw.documents ?? [];
  passages = passagesRaw.passages ?? [];
  topics = topicsRaw.topics ?? [];

  byCprDocumentId = new Map(passageDocs.map((d) => [d.cprDocumentId, d]));
  byCatalogId = new Map(
    passageDocs.filter((d) => d.catalogId).map((d) => [d.catalogId, d]),
  );

  passagesByDoc = new Map();
  for (const p of passages) {
    const list = passagesByDoc.get(p.cprDocumentId) ?? [];
    list.push(p);
    passagesByDoc.set(p.cprDocumentId, list);
  }
}

function clampLimit(raw, fallback = 50) {
  const n = parseInt(raw ?? String(fallback), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 1), 50);
}

function clampOffset(raw) {
  const n = parseInt(raw ?? "0", 10);
  if (Number.isNaN(n)) return 0;
  return Math.max(n, 0);
}

function matchesQuery(passage, q) {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  if (passage.text?.toLowerCase().includes(needle)) return true;
  return passage.topicLabels?.some(
    (t) =>
      t.label?.toLowerCase().includes(needle) ||
      t.matchedText?.toLowerCase().includes(needle),
  );
}

function matchesTopic(passage, topicId) {
  if (!topicId?.trim()) return true;
  return passage.topicIds?.includes(topicId.trim());
}

function filterPassages(rows, { q, topicId } = {}) {
  return rows.filter((p) => matchesQuery(p, q) && matchesTopic(p, topicId));
}

export function getPassageEnrichment(catalogId) {
  if (!catalogId) return null;
  load();
  const doc = byCatalogId.get(catalogId);
  if (!doc) return null;
  return {
    hasPassages: true,
    cprDocumentId: doc.cprDocumentId,
    passageCount: doc.passageCount,
    taggedPassageCount: doc.taggedPassageCount,
    cprUrl: doc.cprUrl,
    slug: doc.slug,
  };
}

export function getPassageCorpusMeta() {
  load();
  return {
    documents: passageDocs,
    topicCount: topics.length,
    passageCount: passages.length,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}

export function getPassageDocument(cprDocumentId) {
  load();
  const doc = byCprDocumentId.get(cprDocumentId);
  if (!doc) return null;
  loadCatalog();
  const catalog = doc.catalogId ? catalogById.get(doc.catalogId) : null;
  return {
    ...doc,
    contentUrl: catalog?.contentUrl ?? null,
    documentUrl: catalog?.documentUrl ?? doc.cprUrl,
    category: catalog?.category ?? null,
    source: catalog?.source ?? null,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}

export function getPassageDocumentByCatalogId(catalogId) {
  load();
  const doc = byCatalogId.get(catalogId);
  if (!doc) return null;
  return getPassageDocument(doc.cprDocumentId);
}

export function listPassages(cprDocumentId, opts = {}) {
  load();
  const doc = byCprDocumentId.get(cprDocumentId);
  if (!doc) return null;

  const limit = clampLimit(opts.limit);
  const offset = clampOffset(opts.offset);
  const all = passagesByDoc.get(cprDocumentId) ?? [];
  const filtered = filterPassages(all, opts);
  const total = filtered.length;

  return {
    cprDocumentId,
    document: doc,
    passages: filtered.slice(offset, offset + limit),
    total,
    limit,
    offset,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}

export function listTopics(opts = {}) {
  load();
  const documentId = opts.documentId?.trim();
  let rows = topics;
  if (documentId) {
    rows = topics.filter((t) => t.documentIds.includes(documentId));
  }
  return {
    topics: rows,
    total: rows.length,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}

export function searchPassages(opts = {}) {
  load();
  const limit = clampLimit(opts.limit);
  const offset = clampOffset(opts.offset);
  const filtered = filterPassages(passages, opts);
  const total = filtered.length;

  const enriched = filtered.slice(offset, offset + limit).map((p) => {
    const doc = byCprDocumentId.get(p.cprDocumentId);
    return {
      ...p,
      documentTitle: doc?.title ?? null,
      documentSlug: doc?.slug ?? null,
      cprUrl: doc?.cprUrl ?? null,
      catalogId: doc?.catalogId ?? null,
    };
  });

  return {
    passages: enriched,
    total,
    limit,
    offset,
    data_source: DATA_SOURCE,
    attribution: ATTRIBUTION,
  };
}
