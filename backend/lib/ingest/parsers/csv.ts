import Papa from "papaparse";
import type { TabularParseResult, ParseWarning } from "../types.js";
import { inferTypesForHeaders } from "../inferTypes.js";

function detectHeaderRow(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const parsed = Papa.parse(line, { delimiter: ",", preview: 1 });
    const fields = parsed.data[0] as string[] | undefined;
    if (!fields?.length) continue;
    const alpha = fields.filter((f) => /[a-zA-Z]/.test(String(f))).length;
    if (alpha >= Math.max(1, fields.length * 0.5)) return i;
  }
  return 0;
}

export function parseCsvText(text: string): TabularParseResult {
  const warnings: ParseWarning[] = [];
  if (!text.trim()) {
    throw new Error("CSV file is empty");
  }

  const lines = text.split(/\r?\n/);
  const headerIndex = detectHeaderRow(lines);
  if (headerIndex > 0) {
    warnings.push({
      message: `Header row auto-detected on line ${headerIndex + 1} (skipped ${headerIndex} preamble row(s))`,
    });
  }

  const csvBody = lines.slice(headerIndex).join("\n");
  const parsed = Papa.parse<Record<string, unknown>>(csvBody, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  for (const err of (parsed.errors ?? []).slice(0, 5)) {
    warnings.push({
      message: `Parse issue at row ${(err.row ?? 0) + headerIndex + 1}: ${err.message}`,
      rowNumbers: err.row != null ? [err.row + headerIndex + 2] : undefined,
    });
  }

  const headers = (parsed.meta.fields ?? []).filter(Boolean) as string[];
  if (!headers.length) {
    throw new Error("CSV has no detectable header row");
  }

  const rows: Record<string, unknown>[] = [];
  const skippedRows: number[] = [];

  parsed.data.forEach((row, idx) => {
    const rowNumber = idx + headerIndex + 2;
    const hasAny = headers.some((h) => {
      const v = row[h];
      return v != null && String(v).trim() !== "";
    });
    if (!hasAny) {
      skippedRows.push(rowNumber);
      return;
    }
    rows.push(row);
  });

  if (skippedRows.length) {
    warnings.push({
      message: `${skippedRows.length} empty row(s) skipped`,
      rowNumbers: skippedRows.slice(0, 100),
    });
  }

  const valueColumn = headers.find((h) => /value|emission|amount|quantity/i.test(h));
  if (valueColumn) {
    const missingValueRows: number[] = [];
    parsed.data.forEach((row, idx) => {
      const v = row[valueColumn];
      if (v == null || String(v).trim() === "") {
        missingValueRows.push(idx + headerIndex + 2);
      }
    });
    if (missingValueRows.length) {
      warnings.push({
        message: `${missingValueRows.length} rows skipped — missing value in '${valueColumn}' column`,
        rowNumbers: missingValueRows.slice(0, 100),
      });
    }
  }

  const inferredTypes = inferTypesForHeaders(headers, rows);

  return {
    headers,
    rows,
    inferredTypes,
    rowCount: rows.length,
    warnings,
  };
}
