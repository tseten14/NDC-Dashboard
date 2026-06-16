/**
 * POST /api/v1/ingest/scan
 * Multipart upload of one or more files (csv, json, txt, pdf).
 * Parses each file, profiles columns / extracts text, looks for NDC keywords,
 * and returns a structured JSON report (no persistence).
 */
import express from "express";
import multer from "multer";
import Papa from "papaparse";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPdfTextSections, buildTabularSections } from "../services/ingestInsights.js";
import { analyzeTabularWithPython, checkPythonIngest } from "../services/ingestPython.js";
import { getPersistenceMode } from "../db/bootstrap.ts";
import {
  createIngestJob,
  getRecentIngestJobs,
  inferIngestFileType,
  insertObservationsBatch,
  updateIngestJobStatus,
} from "../services/persistence.js";
import { createUploadJob, deleteUploadJob, getUploadJob, setUploadJobCleaned } from "../services/ingestUploadStore.js";
import { runPipelineClean } from "../lib/ingest/pipelineClean.ts";
import { applyPipelineDefaults } from "../lib/ingest/pipelineDefaults.ts";
import { parseCsvText } from "../lib/ingest/parsers/csv.ts";
import { parseJsonText } from "../lib/ingest/parsers/json.ts";
import { parsePdfBuffer } from "../lib/ingest/parsers/pdf.ts";
import { extractPdfText, isPdfMagic } from "../lib/ingest/pdfExtract.js";
import { suggestColumnMapping, mappingIsValidForImport } from "../lib/ingest/mapper.ts";
import { mapRowsToObservations } from "../lib/ingest/confirmRows.ts";
import { resolveTargetId } from "../db/id.ts";
import { safeParseOrLog } from "../shared/validate.js";
import { ingestScanReportSchema } from "../shared/schemas/ingestScan.schema.js";
import { requireWriteApiKey } from "../server/middleware/apiKeyAuth.js";
import { validateUploadMime } from "../server/middleware/uploadValidation.js";
import { logIngestEvent } from "../server/logger.js";

const router = express.Router();

// ── OpenAI scan insights ──────────────────────────────────────────────────────

const INGEST_AI_SOURCES = [
  { id: "unfccc_ndc", label: "Uganda NDC Registry (UNFCCC)", url: "https://unfccc.int/NDCREG" },
  { id: "climate_trace", label: "Climate TRACE — Uganda emissions", url: "https://climatetrace.org/inventory?country=UGA" },
  { id: "cpr_uganda", label: "Climate Policy Radar — Uganda", url: "https://app.climatepolicyradar.org/geographies/uganda" },
  { id: "ubos", label: "Uganda Bureau of Statistics", url: "https://www.ubos.org" },
  { id: "mwe", label: "Ministry of Water and Environment", url: "https://www.mwe.go.ug" },
  { id: "wb_uganda", label: "World Bank Open Data — Uganda", url: "https://data.worldbank.org/country/uganda" },
  { id: "faostat", label: "FAOSTAT (agriculture & land use)", url: "https://www.fao.org/faostat" },
  { id: "iea_uganda", label: "IEA — Uganda energy profile", url: "https://www.iea.org/countries/uganda" },
];

const INGEST_AI_SYSTEM = `You are helping Uganda government staff review uploaded climate files. Your reader is a policy officer or programme manager — not a data scientist. Use everyday language only.

Never use technical terms like: null, coercion, schema, parse, JSON, dataframe, profiling, API, slug, or column profiling.
Instead say: empty cells, spreadsheet columns, file format, numbers we could not read, climate targets, sectors, years.


Given a file profiling report, respond ONLY with valid JSON:
{
  "verdict": "ready" | "needs_work" | "not_ndc_relevant",
  "file_description": "<2–3 plain sentences explaining what this dataset or document actually IS in the context of climate policy tracking — say what real-world thing it represents (e.g. 'a collection of Uganda climate-policy documents — national strategies and NDC submissions — with their titles, publication dates and summaries', or 'measured CO2e emissions for Uganda's energy sector by year'), what topics or policy areas its contents cover, and how a climate policy team would actually use it (e.g. tracking NDC implementation, monitoring sector emissions, MRV reporting, or finding evidence for a target). Describe the MEANING and PURPOSE of the data — never describe its row counts, column counts, field names, or file structure>",
  "summary": "<2–3 plain sentences: what this data/document tells us and why it matters for Uganda's NDC>",
  "quality": "<2 sentences: data quality or document completeness assessment, naming the specific columns or sections that are strong or weak>",
  "ndc_targets": ["<target IDs from t0–t10 this data could update, if any>"],
  "policy_value": "<2–3 sentences: concretely how a policy maker or MRV officer could use this file — name the decision or report it could feed>",
  "policy_uses": ["<3–4 ways to use this data in planning — each item is one clear sentence naming a specific Uganda process or report (e.g. progress review, district budget, donor proposal)>"],
  "risks": ["<plain-language concern — max 4, one sentence each>"],
  "next_step": "<1 sentence: the single most important action the user should take>",
  "key_findings": ["<plain-language finding grounded in the actual data — write 4–6 items, one sentence each, mentioning real column names, years, or values where possible>"],
  "sources": [{"id": "<source id from the list below>", "why": "<half-sentence: how this source helps verify or extend this file>"}]
}

Writing rules:
- file_description must explain what the data MEANS and what it is USED FOR in climate policy tracking — a semantic summary, not a description of the file's structure. Never mention row counts, column counts, "tabular dataset", or list raw field names (e.g. avoid "contains titles, summaries, publication dates and URLs"); instead say what those contents tell us (e.g. "tracks which climate policies Uganda has published and what each one commits to").
- file_description must read like 2–3 clear sentences for a non-technical officer — never a bullet list or fragment.
- policy_uses must be actionable planning suggestions tied to THIS file's content — not generic data-cleaning advice (those belong elsewhere).
- Each policy_uses item must name who would use the data, for which official process, and what decision it informs.
- key_findings must cite real column names, years, sectors, or values from the sample data shown.

For "sources": pick 2–4 entries ONLY from this vetted list (use the exact id). Never invent other URLs or sources.
${INGEST_AI_SOURCES.map((s) => `- ${s.id}: ${s.label}`).join("\n")}

Uganda NDC targets: t0=AFOLU/forestry emissions, t1=Energy/power emissions, t4=Transport emissions, t5=Waste emissions, t7=IPPU/industry, t8=CSA adoption (%), t2=Forest cover (%), t3=Electricity capacity (MW), t9=Wetlands coverage (%), t10=Electricity access (%).
Plain language, no jargon. Be specific to THIS file — never generic. Return JSON only — no markdown fences, no preamble.`;

function buildIngestAIPrompt(report) {
  if (!report || report.error) return null;

  if (report.kind === "pdf") {
    const preview = (report.preview ?? "").slice(0, 4500);
    if (!preview) return null;
    return [
      `FILE TYPE: PDF document`,
      `FILENAME: ${report.filename}`,
      `PAGES: ${report.pages ?? "unknown"}`,
      `NDC KEYWORDS FOUND: ${Object.entries(report.keywords ?? {}).map(([b, w]) => `${b}:[${w.join(",")}]`).join(" ") || "none"}`,
      ``,
      `DOCUMENT PREVIEW (first 4500 chars):`,
      preview,
    ].join("\n");
  }

  const about = report.about;
  const analysis = report.analysis;
  const validation = report.validation;
  if (!about && !analysis) return null;

  const sampleRows = Array.isArray(report.sample) ? report.sample.slice(0, 6) : [];

  return [
    `FILE TYPE: ${report.kind ?? "tabular"} | ENGINE: ${report.analysis_engine ?? "unknown"}`,
    `FILENAME: ${report.filename} (${report.rows ?? "?"} rows, ${report.columns?.length ?? "?"} columns)`,
    `DOC TYPE: ${about?.doc_type ?? "unknown"}`,
    `COLUMNS: ${report.columns?.map((c) => `${c.name}(${c.type},${Math.round((c.null_ratio ?? 0) * 100)}%null)`).join(", ") ?? "none"}`,
    `DETECTED: year="${validation?.year_column ?? "?"}" value="${validation?.value_column ?? "?"}" sector="${validation?.sector_column ?? "?"}" unit="${validation?.value_unit ?? "?"}"`,
    `WARNINGS: ${(report.warnings ?? []).join(" | ") || "none"}`,
    `INSIGHTS: ${(analysis?.insights ?? []).slice(0, 6).join(" | ")}`,
    `KEYWORDS: ${Object.entries(report.keywords ?? {}).map(([b, w]) => `${b}:[${w.join(",")}]`).join(" ") || "none"}`,
    `SAMPLE (6 rows): ${JSON.stringify(sampleRows)}`,
  ].join("\n");
}

async function callOpenAIIngestInsights(apiKey, report) {
  const prompt = buildIngestAIPrompt(report);
  if (!prompt) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: INGEST_AI_SYSTEM },
          { role: "user", content: prompt },
        ],
        max_tokens: 2800,
        temperature: 0.15,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const stripped = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(stripped);
    // Resolve vetted source ids to labelled links; drop anything not on the list.
    if (Array.isArray(parsed.sources)) {
      parsed.sources = parsed.sources
        .map((s) => {
          const match = INGEST_AI_SOURCES.find((v) => v.id === s?.id);
          return match ? { label: match.label, url: match.url, why: typeof s.why === "string" ? s.why : "" } : null;
        })
        .filter(Boolean);
    }
    return parsed;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Vercel serverless body limits — keep uploads smaller in production. */
const ON_VERCEL = Boolean(process.env.VERCEL);
const MAX_BYTES = ON_VERCEL ? 4 * 1024 * 1024 : 20 * 1024 * 1024;
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = ON_VERCEL ? 4 : 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
});

const ALLOWED_EXT = new Set(["csv", "json", "txt", "pdf"]);

const KEYWORD_BUCKETS = {
  emissions: ["mtco2e", "tco2e", "co2", "ghg", "emission", "carbon", "methane", "ch4", "n2o"],
  sectors: ["afolu", "energy", "ippu", "agriculture", "waste", "forestry", "transport", "manufacturing"],
  ndc_terms: ["ndc", "baseline", "target", "mrv", "btr", "unfccc", "paris agreement", "mitigation", "adaptation"],
  uganda: ["uganda", "kampala", "wakiso", "mukono", "gulu", "lira", "mbarara", "jinja", "hoima", "soroti"],
  finance: ["usd", "ugx", "budget", "cost", "investment", "financing", "grant", "loan"],
  climate_trace: ["climate trace", "climatetrace", "gadm", "co2e_100yr"],
};

const DATASET_REQUIRED_COLS = {
  indicator_progress: ["indicator_id", "period_end", "value", "validation_status"],
  activity_outputs: ["activity_id", "output_description", "quantity", "unit"],
  district_values: ["indicator_id", "district", "year", "value"],
};

const VALIDATION_STATUS_SET = new Set(["draft", "provisional", "verified"]);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INGEST_STORE_DIR = process.env.VERCEL
  ? path.join("/tmp", "ingest-imports")
  : path.resolve(__dirname, "..", "data", "ingest-imports");

function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeNumber(value) {
  const raw = normalizeString(value).replace(/,/g, "");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeIsoDate(value) {
  const raw = normalizeString(value);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeYear(value) {
  const n = normalizeNumber(value);
  if (n == null) return null;
  const year = Math.round(n);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  return year;
}

function normalizeValidationStatus(value) {
  const raw = normalizeString(value).toLowerCase();
  if (!VALIDATION_STATUS_SET.has(raw)) return null;
  if (raw === "draft") return "Draft";
  if (raw === "provisional") return "Provisional";
  return "Verified";
}

function mapRowByMapping(row, mapping, requiredCols) {
  const out = {};
  for (const col of requiredCols) {
    const src = mapping[col];
    out[col] = src ? row[src] : undefined;
  }
  return out;
}

function duplicateKeyFor(kind, mapped) {
  if (kind === "indicator_progress") {
    return `${normalizeString(mapped.indicator_id)}|${normalizeIsoDate(mapped.period_end) ?? ""}`;
  }
  if (kind === "activity_outputs") {
    return `${normalizeString(mapped.activity_id)}|${normalizeString(mapped.output_description)}|${normalizeString(mapped.unit)}`;
  }
  return `${normalizeString(mapped.indicator_id)}|${normalizeString(mapped.district).toLowerCase()}|${normalizeYear(mapped.year) ?? ""}`;
}

function isCompleteDuplicateKey(key) {
  return key.split("|").every((part) => part !== "");
}

function normalizeByKind(kind, mapped, rowNumber) {
  const errors = [];
  let normalized = null;

  if (kind === "indicator_progress") {
    const indicator_id = normalizeString(mapped.indicator_id);
    const period_end = normalizeIsoDate(mapped.period_end);
    const value = normalizeNumber(mapped.value);
    const validation_status = normalizeValidationStatus(mapped.validation_status);
    if (!indicator_id) errors.push({ row: rowNumber, message: "indicator_id is required" });
    if (!period_end) errors.push({ row: rowNumber, message: "period_end must be a valid date" });
    if (value == null) errors.push({ row: rowNumber, message: "value must be numeric" });
    if (!validation_status) {
      errors.push({ row: rowNumber, message: "validation_status must be Draft, Provisional, or Verified" });
    }
    if (errors.length === 0) {
      normalized = { indicator_id, period_end, value, validation_status };
    }
  }

  if (kind === "activity_outputs") {
    const activity_id = normalizeString(mapped.activity_id);
    const output_description = normalizeString(mapped.output_description);
    const quantity = normalizeNumber(mapped.quantity);
    const unit = normalizeString(mapped.unit);
    if (!activity_id) errors.push({ row: rowNumber, message: "activity_id is required" });
    if (!output_description) errors.push({ row: rowNumber, message: "output_description is required" });
    if (quantity == null) errors.push({ row: rowNumber, message: "quantity must be numeric" });
    if (!unit) errors.push({ row: rowNumber, message: "unit is required" });
    if (errors.length === 0) {
      normalized = { activity_id, output_description, quantity, unit };
    }
  }

  if (kind === "district_values") {
    const indicator_id = normalizeString(mapped.indicator_id);
    const district = normalizeString(mapped.district);
    const year = normalizeYear(mapped.year);
    const value = normalizeNumber(mapped.value);
    if (!indicator_id) errors.push({ row: rowNumber, message: "indicator_id is required" });
    if (!district) errors.push({ row: rowNumber, message: "district is required" });
    if (year == null) errors.push({ row: rowNumber, message: "year must be an integer between 1900 and 2100" });
    if (value == null) errors.push({ row: rowNumber, message: "value must be numeric" });
    if (errors.length === 0) {
      normalized = { indicator_id, district, year, value };
    }
  }

  return { errors, normalized };
}

function validateImportPayload(payload) {
  const errors = [];
  const kind = payload?.kind;
  const status = payload?.status;
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const mapping = payload?.mapping && typeof payload.mapping === "object" ? payload.mapping : {};
  const filename = normalizeString(payload?.filename) || "upload";

  if (!Object.prototype.hasOwnProperty.call(DATASET_REQUIRED_COLS, kind)) {
    return { ok: false, statusCode: 400, error: "Unsupported dataset kind." };
  }
  if (status !== "Draft" && status !== "Published") {
    return { ok: false, statusCode: 400, error: 'status must be "Draft" or "Published".' };
  }
  if (!rows.length) {
    return { ok: false, statusCode: 400, error: "rows must contain at least one record." };
  }

  const requiredCols = DATASET_REQUIRED_COLS[kind];
  for (const col of requiredCols) {
    const source = mapping[col];
    if (!normalizeString(source)) {
      return { ok: false, statusCode: 400, error: `mapping is missing required field "${col}".` };
    }
  }

  const normalizedRows = [];
  const seen = new Set();
  rows.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const mapped = mapRowByMapping(row || {}, mapping, requiredCols);
    for (const col of requiredCols) {
      if (mapped[col] == null || normalizeString(mapped[col]) === "") {
        errors.push({ row: rowNumber, message: `${col} is required` });
      }
    }
    const { errors: rowErrors, normalized } = normalizeByKind(kind, mapped, rowNumber);
    errors.push(...rowErrors);
    const dupeKey = duplicateKeyFor(kind, mapped);
    if (isCompleteDuplicateKey(dupeKey)) {
      if (seen.has(dupeKey)) {
        errors.push({ row: rowNumber, message: "Duplicate record key detected in upload." });
      } else {
        seen.add(dupeKey);
      }
    }
    if (normalized) normalizedRows.push(normalized);
  });

  if (status === "Published" && errors.length > 0) {
    return {
      ok: false,
      statusCode: 400,
      error: "Cannot publish while validation errors exist. Save as Draft or fix rows.",
      details: errors.slice(0, 200),
    };
  }

  return {
    ok: true,
    data: {
      filename,
      kind,
      status,
      rows_total: rows.length,
      rows_ok: normalizedRows.length,
      errors,
      normalizedRows,
    },
  };
}

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

function inferType(values) {
  let numeric = 0;
  let date = 0;
  let bool = 0;
  let other = 0;
  let nulls = 0;
  for (const v of values) {
    if (v === null || v === undefined) {
      nulls++;
      continue;
    }
    const sv = String(v).trim();
    if (sv === "") {
      nulls++;
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(sv)) numeric++;
    else if (/^(true|false|yes|no)$/i.test(sv)) bool++;
    else if (/^\d{4}(-\d{2}-\d{2})?$/.test(sv) || (/\d{4}/.test(sv) && !Number.isNaN(Date.parse(sv)))) date++;
    else other++;
  }
  const total = values.length;
  const non_null = Math.max(1, total - nulls);
  let type = "string";
  if (numeric / non_null > 0.8) type = "number";
  else if (date / non_null > 0.8) type = "date";
  else if (bool / non_null > 0.8) type = "boolean";
  return {
    type,
    total,
    nulls,
    null_ratio: +(nulls / Math.max(1, total)).toFixed(3),
    distinct_kinds: { numeric, date, bool, other },
  };
}

function numericStats(values) {
  const nums = values
    .map((v) => (typeof v === "string" ? parseFloat(v) : Number(v)))
    .filter((v) => Number.isFinite(v));
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    count: nums.length,
    min: +Math.min(...nums).toFixed(2),
    max: +Math.max(...nums).toFixed(2),
    mean: +(sum / nums.length).toFixed(2),
  };
}

function scanKeywords(text) {
  if (!text) return {};
  const lc = text.toLowerCase();
  const hits = {};
  for (const [bucket, words] of Object.entries(KEYWORD_BUCKETS)) {
    const found = words.filter((w) => lc.includes(w));
    if (found.length) hits[bucket] = found;
  }
  return hits;
}

function profileColumns(rows, headers) {
  return headers.map((h) => {
    const values = rows.map((r) => r[h]);
    const typed = inferType(values);
    const stats = typed.type === "number" ? numericStats(values) : null;
    return { name: h, ...typed, stats };
  });
}

function warningsFromColumns(columns) {
  const warnings = [];
  for (const c of columns) {
    if (c.null_ratio >= 0.5) {
      warnings.push(`The “${c.name}” column is mostly empty (${Math.round(c.null_ratio * 100)}% blank cells) — fill it in before using this in reports.`);
    }
  }
  return warnings;
}

async function analyzeCsv(buffer, filename) {
  const text = buffer.toString("utf-8");
  if (!text.trim()) throw new Error("CSV file is empty");

  const py = await analyzeTabularWithPython({ csvText: text, filename });
  if (py) {
    return mergePythonTabularResult(py, {
      kind: "tabular",
      keywords: scanKeywords(text.slice(0, 100_000)),
    });
  }

  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data;
  const headers = parsed.meta.fields ?? [];
  if (!rows.length || !headers.length) throw new Error("CSV file has no usable rows or headers");

  const columns = profileColumns(rows, headers);
  const warnings = warningsFromColumns(columns);
  const sections = buildTabularSections(rows, columns, filename);

  return {
    kind: "tabular",
    rows: rows.length,
    columns,
    sample: rows.slice(0, 5),
    analysis_engine: "javascript",
    validation: sections.validation,
    parse_errors: (parsed.errors ?? []).slice(0, 10).map((e) => ({
      row: e.row,
      code: e.code,
      message: e.message,
    })),
    keywords: scanKeywords(headers.join(" ") + " " + JSON.stringify(rows.slice(0, 200))),
    warnings,
    ...sections,
  };
}

function mergePythonTabularResult(py, extra = {}) {
  const warnings = [...(py.warnings ?? []), ...(py.validation?.notes ?? [])];
  return {
    kind: extra.kind ?? "tabular",
    rows: py.rows,
    columns: py.columns,
    sample: py.sample,
    analysis_engine: py.engine ?? "pandas",
    pandas_version: py.pandas_version,
    validation: py.validation,
    keywords: extra.keywords ?? {},
    warnings,
    about: py.about,
    analysis: py.analysis,
    recommendations: py.recommendations,
    qc: py.qc,
    ...extra,
  };
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Reject files saved as Rich Text / HTML / XML but named .json */
function assertLooksLikeJson(trimmed) {
  const head = trimmed.slice(0, 256).toLowerCase();
  if (/^\{\\rtf\d/i.test(trimmed) || head.includes("\\rtf1")) {
    throw new Error(
      "This file is Rich Text Format (RTF), not JSON. On macOS: open in TextEdit → Format → Make Plain Text, " +
        "then save. Or use VS Code / Cursor and save as UTF-8 .json.",
    );
  }
  if (head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<?xml")) {
    throw new Error(
      "This file looks like HTML/XML, not JSON. Export or save as plain UTF-8 JSON (.json).",
    );
  }
  if (/^sep=|^"[^"]+","[^"]+"/m.test(trimmed.slice(0, 500))) {
    throw new Error(
      "This file looks like CSV/spreadsheet export. Upload it as a .csv file instead of .json.",
    );
  }
  const first = trimmed[0];
  if (first !== "{" && first !== "[") {
    throw new Error(
      `JSON must start with "{" or "[" — this file starts with "${first || "(empty)"}". ` +
        "You may have saved Rich Text or the wrong format.",
    );
  }
}

function removeTrailingCommas(text) {
  return text.replace(/,\s*([}\]])/g, "$1");
}

/** Try strict JSON, then common export fixes (BOM, trailing commas, JSONL, single quotes). */
function parseJsonLenient(rawText, { allowRepair = false } = {}) {
  const trimmed = stripBom(rawText).trim();
  if (!trimmed) throw new Error("JSON file is empty");
  assertLooksLikeJson(trimmed);

  const attempts = [];

  const tryParse = (s, label) => {
    try {
      return { data: JSON.parse(s), via: label };
    } catch (e) {
      attempts.push({ label, message: e.message });
      return null;
    }
  };

  let hit = tryParse(trimmed, "strict");
  if (hit) return hit;

  if (!allowRepair) {
    const first = attempts[0]?.message ?? "could not parse";
    const preview = trimmed.slice(0, 72).replace(/\s+/g, " ");
    throw new Error(
      `${first}. Strict JSON mode is enabled. Near start: «${preview}${trimmed.length > 72 ? "…" : ""}». ` +
        "Fix syntax or re-run scan with JSON repair mode enabled.",
    );
  }

  hit = tryParse(removeTrailingCommas(trimmed), "trailing_commas_removed");
  if (hit) return hit;

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1 && lines.every((l) => l.startsWith("{") || l.startsWith("["))) {
    const objs = [];
    let ok = true;
    for (const line of lines) {
      const row = tryParse(line, "jsonl");
      if (!row) {
        ok = false;
        break;
      }
      objs.push(row.data);
    }
    if (ok && objs.length) return { data: objs, via: "jsonl" };
  }

  const singleQuoted = trimmed
    .replace(/([{,]\s*)'([^'\\]*(?:\\.[^'\\]*)*)'(\s*:)/g, '$1"$2"$3')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g, ': "$1"');
  hit = tryParse(singleQuoted, "single_quotes_normalized");
  if (hit) return hit;

  const first = attempts[0]?.message ?? "could not parse";
  const preview = trimmed.slice(0, 72).replace(/\s+/g, " ");
  throw new Error(
    `${first}. Near start: «${preview}${trimmed.length > 72 ? "…" : ""}». ` +
      "Use double-quoted keys/strings (not JavaScript). Fix trailing commas or use JSONL (one object per line).",
  );
}

async function analyzeJson(buffer, filename, options = {}) {
  const text = buffer.toString("utf-8");
  const { data, via } = parseJsonLenient(text, options);
  const warnings = [];
  if (via !== "strict") {
    warnings.push(`JSON repaired using "${via}" rules — verify values before publishing`);
  }

  if (Array.isArray(data) && data.length && typeof data[0] === "object" && data[0] !== null) {
    const py = await analyzeTabularWithPython({ rows: data, filename });
    if (py) {
      const merged = mergePythonTabularResult(py, {
        kind: "json_array",
        keywords: scanKeywords(text.slice(0, 100_000)),
        parse_mode: via,
      });
      if (via !== "strict") merged.warnings.unshift(warnings[0]);
      return merged;
    }

    const headers = Array.from(new Set(data.flatMap((r) => Object.keys(r || {}))));
    const columns = profileColumns(data, headers);
    const sections = buildTabularSections(data, columns, filename);
    return {
      kind: "json_array",
      rows: data.length,
      columns,
      sample: data.slice(0, 5),
      analysis_engine: "javascript",
      validation: sections.validation,
      keywords: scanKeywords(text.slice(0, 100_000)),
      warnings: [
        ...warnings,
        ...warningsFromColumns(columns),
        "Charts used JavaScript fallback — install pandas for higher accuracy (pip install -r requirements-ingest.txt)",
      ],
      parse_mode: via,
      ...sections,
    };
  }

  return {
    kind: "json_object",
    keys: Object.keys(data ?? {}),
    sample: data,
    keywords: scanKeywords(text.slice(0, 100_000)),
    warnings,
    parse_mode: via,
    about: {
      title: filename,
      doc_type: "JSON configuration / object",
      shape: { keys: Object.keys(data ?? {}).length },
    },
    analysis: {
      mode: "object",
      insights: [`Top-level keys: ${Object.keys(data ?? {}).join(", ").slice(0, 200)}`],
      visuals: {},
    },
    recommendations: [
      "Object-shaped JSON is harder to analyze — consider an array of records for time series / tabular use.",
    ],
  };
}

function analyzeText(buffer, filename) {
  const text = buffer.toString("utf-8");
  if (!text.trim()) throw new Error("Text file is empty");
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim()).length;
  const words = text.match(/\S+/g)?.length ?? 0;
  const sections = buildPdfTextSections(text, filename);
  return {
    kind: "text",
    lines: lines.length,
    non_empty_lines: nonEmpty,
    words,
    chars: text.length,
    preview: text.slice(0, 800),
    keywords: scanKeywords(text),
    warnings: nonEmpty < 3 ? ["File contains fewer than 3 non-empty lines"] : [],
    ...sections,
  };
}

async function analyzePdf(buffer, filename) {
  if (!isPdfMagic(buffer)) {
    throw new Error("File is named .pdf but does not start with %PDF- header (not a valid PDF).");
  }
  const { text, pages, source } = await extractPdfText(buffer);
  if (!text) {
    throw new Error(
      "PDF contains no extractable text. Scanned or image-only PDFs need OCR (not supported by this scanner).",
    );
  }
  const warnings = [];
  if (pages > 50) warnings.push(`Large PDF (${pages} pages); only text content was scanned`);
  if (source === "pdfjs-dist-fallback") warnings.push("PDF parsed via fallback engine; layout may be approximate");
  const sections = buildPdfTextSections(text, filename);
  return {
    kind: "pdf",
    pages,
    chars: text.length,
    preview: text.slice(0, 800),
    keywords: scanKeywords(text),
    warnings,
    parse_engine: source,
    ...sections,
  };
}

async function analyzeFile(file, options = {}) {
  const ext = extOf(file.originalname);
  const base = {
    filename: file.originalname,
    size_bytes: file.size,
    mime: file.mimetype,
    extension: ext,
  };

  if (!ALLOWED_EXT.has(ext)) {
    return { ...base, error: `Unsupported file type ".${ext || "?"}". Allowed: ${[...ALLOWED_EXT].join(", ")}` };
  }
  if (!file.buffer || file.buffer.length === 0) {
    return { ...base, error: "File is empty (0 bytes)" };
  }

  try {
    let analysis;
    if (ext === "csv") analysis = await analyzeCsv(file.buffer, file.originalname);
    else if (ext === "json") analysis = await analyzeJson(file.buffer, file.originalname, options);
    else if (ext === "txt") analysis = analyzeText(file.buffer, file.originalname);
    else if (ext === "pdf") analysis = await analyzePdf(file.buffer, file.originalname);
    return { ...base, ...analysis };
  } catch (err) {
    return { ...base, error: err.message || "Failed to parse file" };
  }
}

function aggregateKeywords(results) {
  const buckets = {};
  for (const r of results) {
    if (!r.keywords) continue;
    for (const [bucket, words] of Object.entries(r.keywords)) {
      if (!buckets[bucket]) buckets[bucket] = new Set();
      for (const w of words) buckets[bucket].add(w);
    }
  }
  return Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, [...v]]));
}

function aggregateQc(results) {
  const totals = {
    rows_input: 0,
    rows_used_for_charts: 0,
    rows_dropped_non_national: 0,
    duplicate_key_rows: 0,
    value_coercion_failures: 0,
    files_repaired_non_strict: 0,
  };
  for (const r of results) {
    if (r.parse_mode && r.parse_mode !== "strict") totals.files_repaired_non_strict += 1;
    const qc = r.qc ?? {};
    totals.rows_input += qc.rows_input ?? 0;
    totals.rows_used_for_charts += qc.rows_used_for_charts ?? 0;
    totals.rows_dropped_non_national += qc.rows_dropped_non_national ?? 0;
    totals.duplicate_key_rows += qc.duplicate_key_rows ?? 0;
    totals.value_coercion_failures += qc.value_coercion_failures ?? 0;
  }
  return totals;
}

function uploadMiddleware(req, res, next) {
  upload.array("files", MAX_FILES)(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `File too large. Max ${MAX_BYTES / 1024 / 1024} MB per file.` });
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(413).json({ error: `Too many files. Max ${MAX_FILES} per upload.` });
    }
    return res.status(400).json({ error: err.message || "Upload failed" });
  });
}

router.post("/ingest/scan", requireWriteApiKey, uploadMiddleware, async (req, res) => {
  try {
    const files = req.files ?? [];
    if (!files.length) {
      return res.status(400).json({
        error: "No files uploaded. Send multipart/form-data with field name 'files'.",
      });
    }

    const started = Date.now();
    const allowJsonRepair =
      String(req.query.allow_json_repair ?? "").toLowerCase() === "true" ||
      String(req.query.json_mode ?? "").toLowerCase() === "repair";
    const results = await Promise.all(files.map((f) => analyzeFile(f, { allowRepair: allowJsonRepair })));

    // AI insights — run in parallel for all analyzable files if OPENAI_API_KEY is set
    const openAIKey = process.env.OPENAI_API_KEY;
    if (openAIKey) {
      const aiResults = await Promise.all(
        results.map((r) => callOpenAIIngestInsights(openAIKey, r).catch(() => null)),
      );
      for (let i = 0; i < results.length; i++) {
        const ai = aiResults[i];
        if (!ai) continue;
        results[i].ai_insights = ai;
        // Surface the AI file description inside "About this document"
        if (typeof ai.file_description === "string" && ai.file_description.trim()) {
          results[i].about = { ...(results[i].about ?? {}), ai_description: ai.file_description.trim() };
        }
        // Normalise policy-planning suggestions (kept in ai_insights, not mixed with data-quality recs)
        if (Array.isArray(ai.policy_uses)) {
          ai.policy_uses = ai.policy_uses
            .filter((u) => typeof u === "string" && u.trim().length > 40)
            .map((u) => u.trim())
            .slice(0, 4);
        }
      }
    }

    // Persist each scanned file so quick scans are saved (Postgres when
    // configured, in-memory fallback otherwise) and appear in the jobs list.
    await Promise.all(
      files.map((f, i) => {
        const ext = (f.originalname?.split(".").pop() || "").toLowerCase();
        const fileType = ext === "json" ? "json" : ext === "pdf" ? "pdf" : "csv";
        const r = results[i] ?? {};
        return createIngestJob({
          filename: f.originalname ?? "upload",
          fileType,
          status: r.error ? "failed" : "complete",
          rowCount: typeof r.rows === "number" ? r.rows : null,
          errorMessage: r.error ?? null,
          createdBy: "quick-scan",
        }).catch((e) => req.log?.warn?.({ err: e }, "scan_job_record_failed"));
      }),
    );

    const files_failed = results.filter((r) => r.error).length;
    const files_ok = results.length - files_failed;
    const total_warnings = results.reduce((a, r) => a + (r.warnings?.length ?? 0), 0);
    const keyword_buckets = aggregateKeywords(results);
    const qc = aggregateQc(results);

    const payload = {
      report_id: `rpt_${Date.now().toString(36)}`,
      generated_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      limits: { max_files: MAX_FILES, max_bytes_per_file: MAX_BYTES, allowed_extensions: [...ALLOWED_EXT] },
      summary: {
        files_received: files.length,
        files_ok,
        files_failed,
        total_warnings,
        keyword_buckets,
        json_mode: allowJsonRepair ? "repair" : "strict",
        qc,
        ai_enhanced: Boolean(openAIKey),
      },
      files: results,
    };
    safeParseOrLog(ingestScanReportSchema, payload, "ingest.scan");
    return res.json(payload);
  } catch (err) {
    req.log?.error({ err }, "ingest_scan_failed");
    return res.status(500).json({ error: err.message || "Internal scan error" });
  }
});

router.post("/ingest/files/import", requireWriteApiKey, async (req, res) => {
  try {
    const validation = validateImportPayload(req.body ?? {});
    if (!validation.ok) {
      return res.status(validation.statusCode ?? 400).json({
        error: validation.error ?? "Invalid import payload.",
        errors: validation.details ?? [],
      });
    }

    const importId = `imp_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const payload = validation.data;

    await mkdir(INGEST_STORE_DIR, { recursive: true });
    const dataFile = path.join(INGEST_STORE_DIR, `${importId}.json`);
    const logFile = path.join(INGEST_STORE_DIR, "audit-log.jsonl");

    await writeFile(
      dataFile,
      JSON.stringify(
        {
          import_id: importId,
          imported_at: now,
          filename: payload.filename,
          kind: payload.kind,
          status: payload.status,
          rows_total: payload.rows_total,
          rows_ok: payload.rows_ok,
          errors: payload.errors,
          rows: payload.normalizedRows,
        },
        null,
        2,
      ),
      "utf8",
    );

    await appendFile(
      logFile,
      JSON.stringify({
        import_id: importId,
        imported_at: now,
        filename: payload.filename,
        kind: payload.kind,
        status: payload.status,
        rows_total: payload.rows_total,
        rows_ok: payload.rows_ok,
        error_count: payload.errors.length,
      }) + "\n",
      "utf8",
    );

    await createIngestJob({
      filename: payload.filename,
      fileType: inferIngestFileType(payload.filename),
      status: payload.errors.length > 0 ? "failed" : "complete",
      rowCount: payload.rows_ok,
      errorMessage: payload.errors.length > 0 ? `${payload.errors.length} validation error(s)` : null,
      createdBy: payload.created_by ?? "ingest-api",
    });

    return res.json({
      import_id: importId,
      status: payload.status,
      kind: payload.kind,
      rows_total: payload.rows_total,
      rows_ok: payload.rows_ok,
      errors: payload.errors.slice(0, 200),
      persisted: true,
    });
  } catch (err) {
    req.log?.error({ err }, "ingest_files_import_failed");
    return res.status(500).json({ error: err.message || "Failed to import dataset." });
  }
});

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES, files: 1 },
});

function detectUploadFileType(file) {
  const ext = extOf(file.originalname);
  const mime = (file.mimetype || "").toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "json" || mime === "application/json" || mime.endsWith("+json")) return "json";
  if (ext === "csv" || mime === "text/csv" || mime === "text/plain" || mime === "application/vnd.ms-excel") {
    return "csv";
  }
  throw new Error(`Unsupported file type "${ext || mime}". Upload PDF, CSV, or JSON only.`);
}

async function parseUploadBuffer(buffer, fileType, filename) {
  if (fileType === "csv") return parseCsvText(buffer.toString("utf-8"));
  if (fileType === "json") return parseJsonText(buffer.toString("utf-8"));
  return parsePdfBuffer(buffer, filename);
}

function formatParseWarnings(warnings) {
  return (warnings ?? []).map((w) =>
    typeof w === "string" ? { message: w } : { message: w.message, rowNumbers: w.rowNumbers },
  );
}

router.post("/ingest/upload", requireWriteApiKey, uploadSingle.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      logIngestEvent({ accepted: false, rejected_reason: "no file in multipart field 'file'" });
      return res.status(400).json({ error: "No file uploaded. Use multipart field name 'file'." });
    }

    const mimeCheck = await validateUploadMime(file.buffer, file.originalname);
    if (!mimeCheck.ok) {
      logIngestEvent({
        accepted: false,
        filename: file.originalname,
        rejected_reason: mimeCheck.reason,
      });
      return res.status(415).json({ error: mimeCheck.reason });
    }

    const fileType = detectUploadFileType(file);
    const parsed = await parseUploadBuffer(file.buffer, fileType, file.originalname);
    const suggested = suggestColumnMapping(parsed.headers, parsed.inferredTypes);
    const { mapping: columnMapping, filters: pipelineDefaults, fileKind } = applyPipelineDefaults(
      parsed.headers,
      suggested,
      parsed.inferredTypes,
    );
    const warnings = formatParseWarnings(parsed.warnings);

    const jobId = randomUUID();
    await createIngestJob({
      id: jobId,
      filename: file.originalname,
      fileType,
      status: "pending",
      rowCount: parsed.rowCount,
      createdBy: "ingest-upload",
    });

    createUploadJob({
      jobId,
      filename: file.originalname,
      fileType,
      parseResult: parsed,
      columnMapping,
      warnings,
    });

    logIngestEvent({
      accepted: true,
      filename: file.originalname,
      fileType,
      rowCount: parsed.rowCount,
    });

    return res.json({
      jobId,
      fileType,
      rowCount: parsed.rowCount,
      headers: parsed.headers,
      inferredTypes: parsed.inferredTypes,
      columnMapping,
      pipelineDefaults,
      fileKind,
      preview: parsed.rows.slice(0, 10),
      warnings,
      ...(parsed.pdfInsights ? { pdfInsights: parsed.pdfInsights } : {}),
    });
  } catch (err) {
    logIngestEvent({
      accepted: false,
      filename: req.file?.originalname,
      rejected_reason: err.message,
    });
    req.log?.error({ err }, "ingest_upload_failed");
    return res.status(400).json({ error: err.message || "Upload parse failed" });
  }
});

async function runStagedPipelineClean(jobId, columnMapping, filters = {}) {
  const staged = getUploadJob(jobId);
  if (!staged) {
    return { error: "Upload job not found or expired. Re-upload the file.", status: 404 };
  }
  const pipelineResult = runPipelineClean(
    staged.parseResult.rows,
    staged.parseResult.headers,
    columnMapping,
    {
      ugandaOnly: Boolean(filters?.ugandaOnly),
      dropDuplicates: filters?.dropDuplicates !== false,
      latestYearOnly: Boolean(filters?.latestYearOnly),
      documentCountMode: Boolean(filters?.documentCountMode),
    },
  );
  setUploadJobCleaned(jobId, pipelineResult);
  return { staged, pipelineResult };
}

async function handlePipelineClean(req, res) {
  try {
    const { jobId, columnMapping, filters } = req.body ?? {};
    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({ error: "jobId is required" });
    }
    if (!columnMapping || typeof columnMapping !== "object") {
      return res.status(400).json({ error: "columnMapping is required" });
    }

    const result = await runStagedPipelineClean(jobId, columnMapping, filters);
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({
      jobId,
      status: "cleaned",
      ...result.pipelineResult,
    });
  } catch (err) {
    req.log?.error({ err }, "ingest_pipeline_scan_failed");
    return res.status(500).json({ error: err.message || "Pipeline scan failed" });
  }
}

router.post("/ingest/pipeline/scan", requireWriteApiKey, handlePipelineClean);
router.post("/ingest/clean", requireWriteApiKey, handlePipelineClean);

router.post("/ingest/confirm", requireWriteApiKey, async (req, res) => {
  try {
    const { jobId, finalColumnMapping, pipelineFilters } = req.body ?? {};
    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({ error: "jobId is required" });
    }
    if (!finalColumnMapping || typeof finalColumnMapping !== "object") {
      return res.status(400).json({ error: "finalColumnMapping is required" });
    }
    const hasValue =
      finalColumnMapping.value ||
      pipelineFilters?.documentCountMode;
    if (!finalColumnMapping.year || !hasValue) {
      return res.status(400).json({ error: "year and value columns must be mapped before import" });
    }
    if (!finalColumnMapping.target_id) {
      return res.status(400).json({ error: "Category / indicator column must be mapped before import" });
    }

    const staged = getUploadJob(jobId);
    if (!staged) {
      return res.status(404).json({ error: "Upload job not found or expired. Re-upload the file." });
    }

    await updateIngestJobStatus(jobId, { status: "processing" });

    let sourceRows = staged.parseResult.rows;
    if (pipelineFilters) {
      const cleaned = runPipelineClean(
        staged.parseResult.rows,
        staged.parseResult.headers,
        finalColumnMapping,
        {
          ugandaOnly: Boolean(pipelineFilters?.ugandaOnly),
          dropDuplicates: pipelineFilters?.dropDuplicates !== false,
          latestYearOnly: Boolean(pipelineFilters?.latestYearOnly),
          documentCountMode: Boolean(pipelineFilters?.documentCountMode),
        },
      );
      sourceRows = cleaned.cleanedRows;
      setUploadJobCleaned(jobId, cleaned);
    } else if (staged.pipelineResult?.cleanedRows?.length != null) {
      sourceRows = staged.pipelineResult.cleanedRows;
    }

    const { observations, errors, skipped } = mapRowsToObservations(
      sourceRows,
      finalColumnMapping,
      resolveTargetId,
    );

    const targetLabels = new Map();
    const targetCol = finalColumnMapping.target_id;
    if (targetCol) {
      for (const row of sourceRows) {
        const raw = row[targetCol];
        if (raw == null || String(raw).trim() === "") continue;
        const label = String(raw).trim();
        targetLabels.set(resolveTargetId(label), label);
      }
    }

    let inserted = 0;
    let storage = null;
    let insertError = null;
    if (observations.length) {
      try {
        const result = await insertObservationsBatch(observations, targetLabels);
        inserted = result.inserted;
        storage = result.storage;
      } catch (err) {
        insertError = err.message || "Database insert failed";
        req.log?.error({ err }, "ingest_observations_insert_failed");
      }
    }

    await mkdir(INGEST_STORE_DIR, { recursive: true });
    const importPath = path.join(INGEST_STORE_DIR, `${jobId}.json`);
    await writeFile(
      importPath,
      JSON.stringify(
        {
          jobId,
          filename: staged.filename,
          fileType: staged.fileType,
          columnMapping: finalColumnMapping,
          imported_at: new Date().toISOString(),
          rows_imported: inserted,
          rows_skipped: skipped,
          errors: errors.slice(0, 200),
          observations: observations.slice(0, 500),
        },
        null,
        2,
      ),
      "utf8",
    );

    const failed =
      insertError != null ||
      (observations.length === 0 && sourceRows.length > 0) ||
      (observations.length > 0 && inserted === 0);
    await updateIngestJobStatus(jobId, {
      status: failed ? "failed" : "complete",
      rowCount: inserted,
      errorMessage: failed
        ? insertError ?? errors[0]?.message ?? "No rows could be imported"
        : errors.length
          ? `${errors.length} row(s) skipped`
          : null,
    });

    deleteUploadJob(jobId);

    const { mode: persistenceMode } = getPersistenceMode();
    const years = observations.map((o) => o.year);
    const targetKeys = new Set(targetLabels.values());

    let dashboardHint = null;
    if (inserted > 0) {
      dashboardHint =
        persistenceMode === "postgres"
          ? `Saved ${inserted} row(s). New categories were registered as targets automatically. Query observations via API: /api/v1/targets/{category}/observations`
          : `Saved ${inserted} row(s) to local storage (${storage}). Data persists across restarts in data/ingest-observations.json.`;
    } else if (insertError) {
      dashboardHint = insertError;
    } else if (failed) {
      dashboardHint = errors[0]?.message ?? "No rows were stored. Check column mapping and try again.";
    }

    return res.json({
      jobId,
      status: failed ? "failed" : "complete",
      rowsImported: inserted,
      rowsSkipped: skipped,
      errors: insertError
        ? [{ row: 0, message: insertError }, ...errors.slice(0, 99)]
        : errors.slice(0, 100),
      persisted: inserted > 0,
      persistenceMode,
      storage,
      targetKeys: [...targetKeys],
      yearRange:
        years.length > 0
          ? { min: Math.min(...years), max: Math.max(...years) }
          : null,
      dashboardHint,
      auditFile: `data/ingest-imports/${jobId}.json`,
    });
  } catch (err) {
    req.log?.error({ err }, "ingest_confirm_failed");
    if (req.body?.jobId) {
      await updateIngestJobStatus(req.body.jobId, {
        status: "failed",
        errorMessage: err.message || "Confirm failed",
      }).catch(() => {});
    }
    return res.status(500).json({ error: err.message || "Confirm import failed" });
  }
});

router.get("/ingest/jobs", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "20", 10) || 20, 100);
    const jobs = await getRecentIngestJobs(limit);
    return res.json({ jobs, count: jobs.length });
  } catch (err) {
    req.log?.error({ err }, "ingest_jobs_list_failed");
    return res.status(500).json({ error: err.message || "Failed to list ingest jobs" });
  }
});

router.get("/ingest/health", async (_req, res) => {
  const python = await checkPythonIngest();
  res.json({
    ok: true,
    accepts: [...ALLOWED_EXT],
    max_files: MAX_FILES,
    max_bytes_per_file: MAX_BYTES,
    analysis: {
      tabular_engine: python.available ? "pandas" : "javascript_fallback",
      python3: python.available,
      pandas_version: python.version ?? null,
      python_error: python.error ?? null,
      install_hint: python.available
        ? null
        : "pip install -r requirements-ingest.txt",
    },
  });
});

export default router;
