/**
 * Data Pipeline cleaning engine (JavaScript).
 * Patterns inspired by open-source CSV ingest tools (csv-import-sanitizer, Pravaah):
 * trim/sanitize → type coercion → geography filter → required-field filter → dedupe → latest year.
 */
import type { ColumnMapping } from "./types.js";
import { extractYearFromValue, parseDateValue } from "./inferTypes.js";
import { isPolicyCatalogFile } from "./pipelineDefaults.js";

export const ROW_COUNT_VALUE_COLUMN = "__row_count__";

export interface PipelineFilterOptions {
  /** Keep rows whose geography column mentions Uganda / UGA */
  ugandaOnly?: boolean;
  /** Drop duplicate rows (policy catalogs: by document URL; indicators: year + value + source + target) */
  dropDuplicates?: boolean;
  /** After cleaning, keep only the latest reporting year */
  latestYearOnly?: boolean;
  /** When no amount column exists, treat each surviving row as value 1 (document count) */
  documentCountMode?: boolean;
}

export interface PipelineStep {
  id: string;
  label: string;
  rowsBefore: number;
  rowsAfter: number;
  removed: number;
  detail?: string;
}

export interface PipelineIssue {
  row: number;
  message: string;
}

export interface PipelineScanResult {
  rowsInput: number;
  rowsOutput: number;
  steps: PipelineStep[];
  cleanedRows: Record<string, unknown>[];
  preview: Record<string, unknown>[];
  issues: PipelineIssue[];
  geographyColumn: string | null;
  engine: "javascript";
  filtersApplied: PipelineFilterOptions;
}

const GEOGRAPHY_CANDIDATES = [
  "geographies",
  "geography",
  "country",
  "countries",
  "region",
  "district",
  "location",
  "admin1",
  "iso3",
  "iso_code",
];

const UGANDA_TOKENS = /\b(uga|ug|uganda)\b/i;

function detectGeographyColumn(headers: string[]): string | null {
  const lower = headers.map((h) => ({ h, lc: h.trim().toLowerCase().replace(/\s+/g, "_") }));
  for (const cand of GEOGRAPHY_CANDIDATES) {
    const hit = lower.find((x) => x.lc === cand || x.lc.includes(cand));
    if (hit) return hit.h;
  }
  return null;
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

/** Normalize ISO datetimes to YYYY-MM-DD for cleaner CSV output. */
function normalizeDateDisplay(raw: unknown): unknown {
  if (raw == null || typeof raw !== "string") return raw;
  const s = raw.trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  return s;
}

/** Strip control chars and neutralise spreadsheet formula injection (=, +, -, @). */
function sanitizeCell(raw: unknown, opts?: { stripHtml?: boolean; normalizeDate?: boolean }): unknown {
  if (raw == null) return raw;
  if (typeof raw !== "string") return raw;
  let s = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim();
  if (opts?.stripHtml && /<[^>]+>/.test(s)) s = stripHtml(s).trim();
  if (opts?.normalizeDate) s = String(normalizeDateDisplay(s));
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return s;
}

function normalizeNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function rowMatchesUganda(row: Record<string, unknown>, geoCol: string): boolean {
  const raw = row[geoCol];
  if (raw == null || String(raw).trim() === "") return false;
  const parts = String(raw)
    .split(/[;,|]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return UGANDA_TOKENS.test(String(raw));
  return parts.some((p) => UGANDA_TOKENS.test(p));
}

function detectDocumentUrlColumn(headers: string[]): string | null {
  const lower = headers.map((h) => ({ h, lc: h.trim().toLowerCase() }));
  const exact = lower.find((x) => x.lc === "document url");
  if (exact) return exact.h;
  const fuzzy = lower.find((x) => /document/.test(x.lc) && /url/.test(x.lc));
  return fuzzy?.h ?? null;
}

function headerByPattern(headers: string[], pattern: RegExp): string | null {
  return headers.find((h) => pattern.test(h.trim())) ?? null;
}

function cellByPattern(
  row: Record<string, unknown>,
  headers: string[],
  pattern: RegExp,
): string {
  const col = headerByPattern(headers, pattern);
  if (!col || row[col] == null) return "";
  return String(row[col]).trim().toLowerCase();
}

function policyDedupeKey(row: Record<string, unknown>, headers: string[]): string {
  const urlCol = detectDocumentUrlColumn(headers);
  const url = urlCol && row[urlCol] != null ? String(row[urlCol]).trim().toLowerCase() : "";
  if (url) return `url:${url}`;

  const titleKey =
    cellByPattern(row, headers, /^document\s*title$/i) ||
    cellByPattern(row, headers, /document\s*title/i);
  const familyKey =
    cellByPattern(row, headers, /^family\s*name$/i) ||
    cellByPattern(row, headers, /family\s*name/i);
  if (titleKey || familyKey) return `doc:${familyKey}|${titleKey}`;
  return `row:${JSON.stringify(row).slice(0, 200)}`;
}

function publicationTimestamp(row: Record<string, unknown>, yearCol: string | null | undefined): number {
  if (!yearCol) return 0;
  const parsed = parseDateValue(row[yearCol]);
  if (parsed) return Date.parse(parsed);
  const year = extractYearFromValue(row[yearCol]);
  return year != null ? Date.parse(`${year}-01-01`) : 0;
}

function dedupeKey(row: Record<string, unknown>, mapping: ColumnMapping): string {
  const parts = ["year", "value", "source", "target_id"].map((field) => {
    const col = mapping[field as keyof ColumnMapping];
    if (!col) return "";
    const v = row[col];
    return v == null ? "" : String(v).trim().toLowerCase();
  });
  return parts.join("|");
}

function applyStep(
  rows: Record<string, unknown>[],
  step: Omit<PipelineStep, "rowsBefore" | "rowsAfter" | "removed"> & {
    filter: (row: Record<string, unknown>) => boolean;
  },
): { rows: Record<string, unknown>[]; step: PipelineStep } {
  const rowsBefore = rows.length;
  const next = rows.filter(step.filter);
  return {
    rows: next,
    step: {
      id: step.id,
      label: step.label,
      detail: step.detail,
      rowsBefore,
      rowsAfter: next.length,
      removed: rowsBefore - next.length,
    },
  };
}

export function runPipelineClean(
  rows: Record<string, unknown>[],
  headers: string[],
  mapping: ColumnMapping,
  filters: PipelineFilterOptions = {},
): PipelineScanResult {
  const filtersApplied: PipelineFilterOptions = {
    ugandaOnly: filters.ugandaOnly ?? false,
    dropDuplicates: filters.dropDuplicates ?? true,
    latestYearOnly: filters.latestYearOnly ?? false,
    documentCountMode: filters.documentCountMode ?? false,
  };

  const effectiveMapping = { ...mapping };
  if (filtersApplied.documentCountMode && !mapping.value) {
    effectiveMapping.value = ROW_COUNT_VALUE_COLUMN;
  }

  const geographyColumn = detectGeographyColumn(headers);
  const policyCatalog = isPolicyCatalogFile(headers);
  const documentUrlColumn = detectDocumentUrlColumn(headers);
  const dateHeaders = new Set(
    headers.filter((h) => /date/i.test(h) || h === effectiveMapping.year),
  );
  const steps: PipelineStep[] = [];
  const issues: PipelineIssue[] = [];

  let work = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const h of headers) {
      out[h] = sanitizeCell(row[h], {
        stripHtml: policyCatalog,
        normalizeDate: dateHeaders.has(h),
      });
    }
    if (effectiveMapping.value === ROW_COUNT_VALUE_COLUMN) {
      out[ROW_COUNT_VALUE_COLUMN] = 1;
    }
    return out;
  });

  {
    const details = [
      "Trim whitespace, remove control characters, and neutralise spreadsheet formulas.",
      policyCatalog ? "Strip HTML tags from text fields." : null,
      dateHeaders.size ? "Normalize date columns to YYYY-MM-DD." : null,
    ].filter(Boolean);
    const s: PipelineStep = {
      id: "sanitize",
      label: "Sanitize cell text",
      rowsBefore: rows.length,
      rowsAfter: work.length,
      removed: 0,
      detail: details.join(" "),
    };
    steps.push(s);
  }

  if (filtersApplied.documentCountMode && !mapping.value) {
    steps.push({
      id: "document_count",
      label: "Document count mode",
      rowsBefore: work.length,
      rowsAfter: work.length,
      removed: 0,
      detail: "No amount column mapped — each row is assigned value 1 for counting documents.",
    });
  }

  const yearCol = effectiveMapping.year;
  const valueCol = effectiveMapping.value;

  if (filtersApplied.ugandaOnly && geographyColumn) {
    const { rows: next, step } = applyStep(work, {
      id: "uganda_filter",
      label: "Uganda geography filter",
      detail: `Kept rows where “${geographyColumn}” includes Uganda or UGA.`,
      filter: (row) => rowMatchesUganda(row, geographyColumn),
    });
    work = next;
    steps.push(step);
  } else if (filtersApplied.ugandaOnly && !geographyColumn) {
    steps.push({
      id: "uganda_filter",
      label: "Uganda geography filter",
      rowsBefore: work.length,
      rowsAfter: work.length,
      removed: 0,
      detail: "Skipped — no geography column detected (Geographies, Country, Region, etc.).",
    });
  }

  if (yearCol || valueCol) {
    const { rows: next, step } = applyStep(work, {
      id: "required_fields",
      label: "Required mapped fields",
      detail: [
        yearCol ? `Year from “${yearCol}”` : null,
        valueCol ? `Value from “${valueCol}”` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      filter: (row) => {
        if (yearCol && extractYearFromValue(row[yearCol]) == null) return false;
        if (valueCol && normalizeNumber(row[valueCol]) == null) return false;
        return true;
      },
    });
    work = next;
    steps.push(step);
  }

  if (filtersApplied.dropDuplicates && (policyCatalog || yearCol || valueCol)) {
    const before = work.length;
    let deduped: Record<string, unknown>[] = [];

    if (policyCatalog) {
      const byKey = new Map<string, Record<string, unknown>>();
      work.forEach((row, idx) => {
        const key = policyDedupeKey(row, headers);
        const existing = byKey.get(key);
        if (!existing) {
          byKey.set(key, row);
          return;
        }
        const keepNew =
          publicationTimestamp(row, yearCol) >= publicationTimestamp(existing, yearCol);
        if (keepNew) {
          issues.push({ row: idx + 1, message: "Duplicate document URL — kept newer publication date" });
          byKey.set(key, row);
        } else {
          issues.push({ row: idx + 1, message: "Duplicate document URL removed" });
        }
      });
      deduped = [...byKey.values()];
      steps.push({
        id: "dedupe",
        label: "Remove duplicate documents",
        rowsBefore: before,
        rowsAfter: deduped.length,
        removed: before - deduped.length,
        detail: documentUrlColumn
          ? `Same “${documentUrlColumn}” appears only once (newest publication date kept).`
          : "Same document title + family name appears only once.",
      });
    } else {
      const seen = new Set<string>();
      work.forEach((row, idx) => {
        const key = dedupeKey(row, effectiveMapping);
        if (seen.has(key)) {
          issues.push({ row: idx + 1, message: "Duplicate row removed" });
          return;
        }
        seen.add(key);
        deduped.push(row);
      });
      steps.push({
        id: "dedupe",
        label: "Remove duplicate rows",
        rowsBefore: before,
        rowsAfter: deduped.length,
        removed: before - deduped.length,
        detail: "Same year, value, source, and target combination appears only once.",
      });
    }
    work = deduped;
  }

  if (filtersApplied.latestYearOnly && yearCol) {
    let latest: number | null = null;
    for (const row of work) {
      const y = extractYearFromValue(row[yearCol]);
      if (y != null) latest = latest == null ? y : Math.max(latest, y);
    }
    if (latest != null) {
      const { rows: next, step } = applyStep(work, {
        id: "latest_year",
        label: "Latest year only",
        detail: `Kept rows for ${latest} only.`,
        filter: (row) => extractYearFromValue(row[yearCol]) === latest,
      });
      work = next;
      steps.push(step);
    }
  }

  return {
    rowsInput: rows.length,
    rowsOutput: work.length,
    steps,
    cleanedRows: work,
    preview: work.slice(0, 10),
    issues: issues.slice(0, 100),
    geographyColumn,
    engine: "javascript",
    filtersApplied,
  };
}
