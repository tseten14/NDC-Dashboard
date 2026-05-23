/**
 * POST /api/v1/ingest/scan
 * Multipart upload of one or more files (csv, json, txt, pdf).
 * Parses each file, profiles columns / extracts text, looks for NDC keywords,
 * and returns a structured JSON report (no persistence).
 */
import express from "express";
import multer from "multer";
import Papa from "papaparse";
import { buildPdfTextSections, buildTabularSections } from "../services/ingestInsights.js";
import { analyzeTabularWithPython, checkPythonIngest } from "../services/ingestPython.js";

const router = express.Router();

/** Vercel serverless body limits — keep uploads smaller in production. */
const ON_VERCEL = Boolean(process.env.VERCEL);
const MAX_BYTES = ON_VERCEL ? 4 * 1024 * 1024 : 20 * 1024 * 1024;
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
      warnings.push(`Column "${c.name}" is ${Math.round(c.null_ratio * 100)}% empty`);
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
  warnings.push("Charts used JavaScript fallback — install pandas for higher accuracy (pip install -r requirements-ingest.txt)");

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
function parseJsonLenient(rawText) {
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

async function analyzeJson(buffer, filename) {
  const text = buffer.toString("utf-8");
  const { data, via } = parseJsonLenient(text);
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

function isPdfMagic(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).toString("ascii") === "%PDF-";
}

async function extractPdfText(buffer) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const r = await parser.getText();
      const pages = r.total ?? r.pages?.length ?? 0;
      const text = (r.text || "")
        .replace(/-- \d+ of \d+ --/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return { text, pages, source: "pdf-parse" };
    } finally {
      await parser.destroy().catch(() => {});
    }
  } catch (primaryErr) {
    try {
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      let text = "";
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((it) => ("str" in it ? it.str : ""))
            .join(" ")
            .trim() + "\n";
        page.cleanup();
      }
      await doc.destroy();
      return { text: text.trim(), pages: doc.numPages, source: "pdfjs-dist-fallback" };
    } catch (fallbackErr) {
      const root = primaryErr.message || String(primaryErr);
      const fb = fallbackErr.message || String(fallbackErr);
      throw new Error(`PDF text extraction failed: ${root} | fallback: ${fb}`);
    }
  }
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

async function analyzeFile(file) {
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
    else if (ext === "json") analysis = await analyzeJson(file.buffer, file.originalname);
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

router.post("/ingest/scan", uploadMiddleware, async (req, res) => {
  try {
    const files = req.files ?? [];
    if (!files.length) {
      return res.status(400).json({
        error: "No files uploaded. Send multipart/form-data with field name 'files'.",
      });
    }

    const started = Date.now();
    const results = await Promise.all(files.map(analyzeFile));

    const files_failed = results.filter((r) => r.error).length;
    const files_ok = results.length - files_failed;
    const total_warnings = results.reduce((a, r) => a + (r.warnings?.length ?? 0), 0);
    const keyword_buckets = aggregateKeywords(results);

    return res.json({
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
      },
      files: results,
    });
  } catch (err) {
    console.error("[ingest/scan]", err);
    return res.status(500).json({ error: err.message || "Internal scan error" });
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
