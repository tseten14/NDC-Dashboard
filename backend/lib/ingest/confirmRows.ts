/**
 * Turns reviewed spreadsheet rows into records ready to save.
 *
 * The last step of an import. By this point the user has confirmed which column
 * means what, so each row is converted into an observation — a target, a year
 * and a value — with the numbers and years checked as it goes. Rows that cannot
 * be made sense of are collected as errors and reported back rather than being
 * quietly dropped, so nobody ends up with a partial import they did not notice.
 */
import type { ColumnMapping } from "./types.js";
import { extractYearFromValue } from "./inferTypes.js";

export interface MappedObservationRow {
  targetId: string;
  year: number;
  value: number;
  source: string;
  sourceRow: number;
}

export interface MapRowsResult {
  observations: MappedObservationRow[];
  errors: Array<{ row: number; message: string }>;
  skipped: number;
}

function normalizeNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/,/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const ROW_COUNT_VALUE_COLUMN = "__row_count__";

export function mapRowsToObservations(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping,
  resolveTargetId: (raw: string) => string,
): MapRowsResult {
  const observations: MappedObservationRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let skipped = 0;

  const yearCol = mapping.year;
  const valueCol = mapping.value;
  const sourceCol = mapping.source;
  const targetCol = mapping.target_id;

  if (!yearCol || !valueCol) {
    return {
      observations: [],
      errors: [{ row: 0, message: "year and value columns must be mapped" }],
      skipped: rows.length,
    };
  }

  rows.forEach((row, idx) => {
    const sourceRow = idx + 1;
    const year = extractYearFromValue(row[yearCol]);
    const value =
      valueCol === ROW_COUNT_VALUE_COLUMN
        ? 1
        : normalizeNumber(row[valueCol]);

    if (year == null) {
      errors.push({ row: sourceRow, message: `Invalid or missing year in "${yearCol}"` });
      skipped++;
      return;
    }
    if (value == null) {
      errors.push({ row: sourceRow, message: `Invalid or missing value in "${valueCol}"` });
      skipped++;
      return;
    }

    let targetId: string | null = null;
    if (targetCol && row[targetCol] != null && String(row[targetCol]).trim() !== "") {
      targetId = resolveTargetId(String(row[targetCol]).trim());
    }

    if (!targetId) {
      errors.push({ row: sourceRow, message: "Missing or unresolvable target_id" });
      skipped++;
      return;
    }

    const source =
      sourceCol && row[sourceCol] != null && String(row[sourceCol]).trim() !== ""
        ? String(row[sourceCol]).trim()
        : "ingest-upload";

    observations.push({ targetId, year, value, source, sourceRow });
  });

  return { observations, errors, skipped };
}
