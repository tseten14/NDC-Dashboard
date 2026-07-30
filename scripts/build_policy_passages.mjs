#!/usr/bin/env node
/**
 * Build step: split policy documents into searchable passages.
 *
 * Whole documents are too coarse to search usefully. This cuts each one into
 * short passages and records where each came from, so a search can point at the
 * exact paragraph that answers a question and cite it properly.
 *
 * Usage: npm run build:passages
 */
/**
 * Build passage corpus JSON from Climate Policy Radar passage-level CSV export.
 * Usage: node scripts/build_policy_passages.mjs [path/to/export.csv]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildTopicLabels,
  cprDocumentUrl,
  normalizeTitle,
  parseTopicIds,
  parseTopicLabellers,
  slugFromDocumentUrl,
} from "../backend/services/policyPassageParser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_CSV = join(ROOT, "data", "sources", "Uganda_key_docs_2026-06-11-1549.csv");
const CATALOG_PATH = join(ROOT, "data", "policy/documents.json");

const PASSAGE_HEADERS = [
  "DOCUMENT_ID",
  "DOCUMENT_NAME",
  "FAMILY_ID",
  "DOCUMENT_SLUG",
  "FAMILY_SUMMARY",
  "TEXT_BLOCK_ID",
  "PASSAGE_INDEX",
  "TEXT_PASSAGE",
  "PASSAGE_TYPE",
  "LANGUAGE",
  "TOPIC_LABELLERS",
  "TOPIC_IDS",
  "TOPIC_LABELLED_TEXTS",
];

/** RFC 4180-style parser with multiline quoted fields. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0]?.trim()) rows.push(row);
      row = [];
      if (c === "\r") i++;
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.length > 1 || row[0]?.trim()) rows.push(row);
  }

  return rows;
}

function passageId(cprDocumentId, passageIndex, textBlockId) {
  const key = `${cprDocumentId}|${passageIndex}|${textBlockId}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function loadCatalogIndex() {
  if (!existsSync(CATALOG_PATH)) return { bySlug: new Map(), byTitle: new Map() };
  const raw = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const bySlug = new Map();
  const byTitle = new Map();
  for (const doc of raw.documents ?? []) {
    const slug = slugFromDocumentUrl(doc.documentUrl);
    if (slug) bySlug.set(slug, doc.id);
    const nt = normalizeTitle(doc.title);
    if (nt) {
      if (!byTitle.has(nt)) byTitle.set(nt, doc.id);
    }
  }
  return { bySlug, byTitle };
}

function resolveCatalogId(slug, title, catalogIndex) {
  if (slug && catalogIndex.bySlug.has(slug)) return catalogIndex.bySlug.get(slug);
  const nt = normalizeTitle(title);
  return catalogIndex.byTitle.get(nt) ?? null;
}

function main() {
  const csvPath = resolve(process.argv[2] || DEFAULT_CSV);
  let raw;
  try {
    raw = readFileSync(csvPath, "utf8");
  } catch (err) {
    console.error(`Failed to read CSV: ${csvPath}`);
    console.error(err.message);
    process.exit(1);
  }

  const table = parseCsv(raw);
  if (table.length < 2) {
    console.error("CSV has no data rows");
    process.exit(1);
  }

  const header = table[0];
  const colIndex = {};
  for (const name of PASSAGE_HEADERS) {
    const idx = header.indexOf(name);
    if (idx === -1) console.warn(`Warning: missing column "${name}"`);
    colIndex[name] = idx;
  }

  const catalogIndex = loadCatalogIndex();
  const docStats = new Map();
  const passages = [];
  const topicIndex = new Map();

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const get = (name) => cells[colIndex[name]]?.trim() ?? "";

    const cprDocumentId = get("DOCUMENT_ID");
    if (!cprDocumentId) continue;

    const slug = get("DOCUMENT_SLUG");
    const title = get("DOCUMENT_NAME");
    const familySummary = get("FAMILY_SUMMARY");
    const passageIndex = parseInt(get("PASSAGE_INDEX"), 10) || 0;
    const textBlockId = get("TEXT_BLOCK_ID");
    const text = get("TEXT_PASSAGE");
    const passageType = get("PASSAGE_TYPE") || "paragraph";
    const language = get("LANGUAGE") || "en";

    const topicIds = parseTopicIds(get("TOPIC_IDS"));
    const labellers = parseTopicLabellers(get("TOPIC_LABELLERS"));
    const topicLabels = buildTopicLabels(topicIds, get("TOPIC_LABELLED_TEXTS"), labellers);
    const hasTopics = topicIds.length > 0;

    if (!docStats.has(cprDocumentId)) {
      docStats.set(cprDocumentId, {
        cprDocumentId,
        slug,
        title,
        familyId: get("FAMILY_ID") || null,
        familySummary,
        cprUrl: cprDocumentUrl(slug),
        catalogId: resolveCatalogId(slug, title, catalogIndex),
        passageCount: 0,
        taggedPassageCount: 0,
      });
    }

    const stats = docStats.get(cprDocumentId);
    stats.passageCount += 1;
    if (hasTopics) stats.taggedPassageCount += 1;

    const passage = {
      id: passageId(cprDocumentId, passageIndex, textBlockId),
      cprDocumentId,
      passageIndex,
      textBlockId,
      text,
      passageType,
      language,
      topicIds,
      topicLabels,
      topicLabellers: labellers.map((l) => l.type).filter((t) => t !== "unknown"),
    };
    passages.push(passage);

    for (const label of topicLabels) {
      const existing = topicIndex.get(label.id) ?? {
        id: label.id,
        label: label.label,
        passageCount: 0,
        documentIds: new Set(),
      };
      existing.passageCount += 1;
      existing.documentIds.add(cprDocumentId);
      if (!existing.label && label.label) existing.label = label.label;
      topicIndex.set(label.id, existing);
    }
  }

  const documents = [...docStats.values()].sort((a, b) => a.title.localeCompare(b.title));
  const topics = [...topicIndex.values()]
    .map((t) => ({
      id: t.id,
      label: t.label,
      passageCount: t.passageCount,
      documentIds: [...t.documentIds].sort(),
    }))
    .sort((a, b) => b.passageCount - a.passageCount || a.id.localeCompare(b.id));

  const generatedAt = new Date().toISOString();

  const docsPayload = {
    version: 1,
    generatedAt,
    sourceFile: csvPath,
    source: "climate_policy_radar_passage_export",
    count: documents.length,
    documents,
  };

  const passagesPayload = {
    version: 1,
    generatedAt,
    sourceFile: csvPath,
    count: passages.length,
    passages,
  };

  const topicsPayload = {
    version: 1,
    generatedAt,
    sourceFile: csvPath,
    count: topics.length,
    topics,
  };

  const docsOut = join(ROOT, "data", "policy/passage-documents.json");
  const passagesOut = join(ROOT, "data", "policy/passages.json");
  const topicsOut = join(ROOT, "data", "policy/topics-index.json");

  writeFileSync(docsOut, `${JSON.stringify(docsPayload, null, 2)}\n`, "utf8");
  writeFileSync(passagesOut, `${JSON.stringify(passagesPayload, null, 2)}\n`, "utf8");
  writeFileSync(topicsOut, `${JSON.stringify(topicsPayload, null, 2)}\n`, "utf8");

  console.log(`Wrote ${documents.length} passage documents → ${docsOut}`);
  console.log(`Wrote ${passages.length} passages → ${passagesOut}`);
  console.log(`Wrote ${topics.length} topics → ${topicsOut}`);
  for (const d of documents) {
    console.log(`  ${d.title}: ${d.passageCount} passages (${d.taggedPassageCount} tagged), catalogId=${d.catalogId ?? "—"}`);
  }
}

main();
