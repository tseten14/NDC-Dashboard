#!/usr/bin/env node
/**
 * Build MCF (multilateral climate fund) searchable corpus from policy documents export.
 * Enriches metadata with searchable text; ready for Anne's full-text drop-in via same schema.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CATALOG_PATH = join(ROOT, "data", "policy", "documents.json");
const OUT_PATH = join(ROOT, "data", "policy", "mcf-projects.json");
const OPTIONAL_SOURCE = process.argv[2]
  ? join(ROOT, process.argv[2])
  : null;

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Best-effort USD amount from summary text (millions). */
function parseAmountUsd(text) {
  if (!text) return null;
  const m = text.match(
    /(?:USD|US\$|\$)\s*([\d,.]+)\s*(million|m\b|bn|billion)?/i,
  );
  if (!m) return null;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const unit = (m[2] || "").toLowerCase();
  if (unit.startsWith("b")) n *= 1000;
  return Math.round(n * 100) / 100;
}

function loadCatalog() {
  const raw = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  return (raw.documents ?? []).filter((d) => d.category === "MCF");
}

function main() {
  let extra = [];
  if (OPTIONAL_SOURCE) {
    try {
      const raw = JSON.parse(readFileSync(OPTIONAL_SOURCE, "utf8"));
      extra = raw.projects ?? raw.documents ?? [];
    } catch (e) {
      console.warn(`Optional MCF source not loaded: ${e.message}`);
    }
  }

  const byId = new Map();
  for (const d of loadCatalog()) {
    const summary = stripHtml(d.familySummary);
    byId.set(d.id, {
      id: d.id,
      title: d.title,
      funder: d.source ?? null,
      amountUsd: parseAmountUsd(summary) ?? parseAmountUsd(d.title),
      familyDate: d.familyDate ?? null,
      documentUrl: d.documentUrl,
      contentUrl: d.contentUrl ?? null,
      geographies: d.geographies ?? [],
      searchableText: [d.title, d.familyName, summary, d.source].filter(Boolean).join(" "),
      fullText: null,
      catalogId: d.id,
    });
  }

  for (const row of extra) {
    const id = row.id ?? row.catalogId ?? row.project_id;
    if (!id) continue;
    const existing = byId.get(id) ?? {};
    byId.set(id, {
      ...existing,
      ...row,
      id,
      searchableText:
        row.fullText ??
        row.searchableText ??
        existing.searchableText ??
        row.title ??
        "",
      amountUsd: row.amountUsd ?? row.amount_usd ?? existing.amountUsd ?? null,
    });
  }

  const projects = [...byId.values()].sort((a, b) =>
    (a.title || "").localeCompare(b.title || ""),
  );

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: "climate_policy_radar_export_mcf",
    count: projects.length,
    projects,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${projects.length} MCF projects → ${OUT_PATH}`);
}

main();
