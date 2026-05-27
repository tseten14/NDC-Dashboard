import type { TabularParseResult, ParseWarning } from "../types.js";
import { inferTypesForHeaders } from "../inferTypes.js";

function flattenOneLevel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val != null && typeof val === "object" && !Array.isArray(val)) {
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        out[`${key}_${subKey}`] = subVal;
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

function unwrapRecords(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((r) => r && typeof r === "object" && !Array.isArray(r)) as Record<string, unknown>[];
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) {
      return o.data.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    }
    if (Array.isArray(o.records)) {
      return o.records.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    }
    if (Array.isArray(o.rows)) {
      return o.rows.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
    }
  }
  throw new Error("JSON must be an array of objects or { data: [...] } envelope");
}

export function parseJsonText(text: string): TabularParseResult {
  const warnings: ParseWarning[] = [];
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) throw new Error("JSON file is empty");

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }

  const rawRows = unwrapRecords(parsed);
  if (!rawRows.length) {
    throw new Error("JSON contains no object records");
  }

  const rows = rawRows.map(flattenOneLevel);
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));

  const skippedRows: number[] = [];
  const filtered: Record<string, unknown>[] = [];
  rows.forEach((row, idx) => {
    const hasAny = headers.some((h) => {
      const v = row[h];
      return v != null && String(v).trim() !== "";
    });
    if (!hasAny) {
      skippedRows.push(idx + 1);
      return;
    }
    filtered.push(row);
  });

  if (skippedRows.length) {
    warnings.push({
      message: `${skippedRows.length} empty record(s) skipped`,
      rowNumbers: skippedRows.slice(0, 100),
    });
  }

  const inferredTypes = inferTypesForHeaders(headers, filtered);

  return {
    headers,
    rows: filtered,
    inferredTypes,
    rowCount: filtered.length,
    warnings,
  };
}
