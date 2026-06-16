#!/usr/bin/env node
/**
 * Build data/policy/documents.json from Climate Policy Radar CSV export.
 * Usage: node scripts/build_policy_documents.mjs [path/to/export.csv]
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_CSV = join(ROOT, "data", "sources", "uganda-policy-documents-2026-06-09.csv");

const HEADERS = [
  "Collection Name",
  "Collection Summary",
  "Family Name",
  "Family Summary",
  "Family Publication Date",
  "Family URL",
  "Document Title",
  "Document URL",
  "Document Content URL",
  "Document Type",
  "Document Content Matches Search Phrase",
  "Geographies",
  "Category",
  "Languages",
  "Source",
];

function stripHtml(html) {
  if (!html || html === "n/a") return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

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

function stableId(documentUrl) {
  return createHash("sha256").update(documentUrl || "").digest("hex").slice(0, 16);
}

function parseGeographies(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split(";")
    .map((g) => g.trim())
    .filter(Boolean);
}

function isUganda(geographies) {
  return geographies.some((g) => g === "UGA" || g.startsWith("UGA"));
}

function parseDate(iso) {
  if (!iso?.trim()) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

function rowToDoc(cells, colIndex) {
  const get = (name) => cells[colIndex[name]]?.trim() ?? "";

  const documentUrl = get("Document URL");
  if (!documentUrl) return null;

  const geographies = parseGeographies(get("Geographies"));
  if (!isUganda(geographies)) return null;

  return {
    id: stableId(documentUrl),
    title: get("Document Title") || get("Family Name") || "Untitled",
    familyName: get("Family Name"),
    familySummary: stripHtml(get("Family Summary")),
    familyDate: parseDate(get("Family Publication Date")),
    familyUrl: get("Family URL"),
    documentUrl,
    contentUrl: get("Document Content URL") || null,
    documentType: get("Document Type") || null,
    category: get("Category") || "Uncategorized",
    source: get("Source") || null,
    geographies,
    languages: get("Languages") || null,
    collectionName: get("Collection Name") || null,
  };
}

function dedupeByDocumentUrl(docs) {
  const byUrl = new Map();
  for (const doc of docs) {
    const existing = byUrl.get(doc.documentUrl);
    if (!existing) {
      byUrl.set(doc.documentUrl, doc);
      continue;
    }
    const a = doc.familyDate ? Date.parse(doc.familyDate) : 0;
    const b = existing.familyDate ? Date.parse(existing.familyDate) : 0;
    if (a >= b) byUrl.set(doc.documentUrl, doc);
  }
  return [...byUrl.values()].sort((a, b) => {
    const da = a.familyDate ? Date.parse(a.familyDate) : 0;
    const db = b.familyDate ? Date.parse(b.familyDate) : 0;
    return db - da;
  });
}

function findDocId(docs, predicate) {
  const hit = docs.find(predicate);
  return hit?.id ?? null;
}

function buildCurated(docs) {
  const byId = (id) => (id ? docs.find((d) => d.id === id) : null);

  const ndcId = findDocId(
    docs,
    (d) =>
      d.category === "UN Submissions" &&
      /nationally determined contribution|updated ndc/i.test(`${d.title} ${d.familyName}`),
  );
  const burId = findDocId(
    docs,
    (d) =>
      d.category === "UN Submissions" &&
      /biennial update report|bur2|second biennial/i.test(`${d.title} ${d.familyName}`),
  );
  const wetlandId = findDocId(docs, (d) => /wetland strategic plan/i.test(`${d.title} ${d.familyName}`));
  const agroforestryId = findDocId(docs, (d) => /agroforestry strategy/i.test(`${d.title} ${d.familyName}`));
  const reddId = findDocId(
    docs,
    (d) =>
      d.category === "MCF" &&
      d.source === "GCF" &&
      /redd\+ rbp/i.test(`${d.title} ${d.familyName}`) &&
      /approved funding proposal/i.test(d.documentType || ""),
  );
  const ureapId = findDocId(docs, (d) => /rural electrification access project/i.test(`${d.title} ${d.familyName}`));

  const global = [ndcId, burId, wetlandId, reddId].filter(Boolean);

  const sectorMap = {
    AFOLU: [wetlandId, agroforestryId, reddId].filter(Boolean),
    Energy: [ureapId].filter(Boolean),
    Transport: [],
    IPPU: [],
    Agriculture: [agroforestryId].filter(Boolean),
    Waste: [],
  };

  const dashboard = {};
  for (const [sector, ids] of Object.entries(sectorMap)) {
    const merged = [...new Set([...global, ...ids])];
    dashboard[sector] = merged;
  }

  const finance = {
    default: [reddId, ureapId].filter(Boolean),
    AFOLU: [reddId, wetlandId, agroforestryId].filter(Boolean),
    Energy: [ureapId].filter(Boolean),
  };

  return {
    version: 1,
    description: "Bonn demo curated links — document ids from policy/documents.json",
    global,
    dashboard,
    finance,
    resolved: {
      ndc: byId(ndcId)?.title,
      bur: byId(burId)?.title,
      wetland: byId(wetlandId)?.title,
      redd: byId(reddId)?.title,
    },
  };
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
  for (const name of HEADERS) {
    const idx = header.indexOf(name);
    if (idx === -1) console.warn(`Warning: missing column "${name}"`);
    colIndex[name] = idx;
  }

  const docs = [];
  for (let i = 1; i < table.length; i++) {
    const doc = rowToDoc(table[i], colIndex);
    if (doc) docs.push(doc);
  }

  const documents = dedupeByDocumentUrl(docs);
  const payload = {
    generatedAt: new Date().toISOString(),
    sourceFile: csvPath,
    count: documents.length,
    documents,
  };

  const outPath = join(ROOT, "data", "policy/documents.json");
  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const curated = buildCurated(documents);
  const curatedPath = join(ROOT, "data", "policy/curated.json");
  writeFileSync(curatedPath, `${JSON.stringify(curated, null, 2)}\n`, "utf8");

  console.log(`Wrote ${documents.length} documents → ${outPath}`);
  console.log(`Wrote curated config → ${curatedPath}`);
  console.log("Curated resolved:", curated.resolved);
}

main();
