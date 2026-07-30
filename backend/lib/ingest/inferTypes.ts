/**
 * Guesses what kind of information a spreadsheet column holds.
 *
 * Given a column of raw text, works out whether it looks like years, numbers,
 * dates or plain labels. This is what lets the import screen pre-fill its
 * suggestions instead of asking the user to describe every column by hand.
 *
 * These are only suggestions: the user always sees them and can correct them
 * before anything is saved.
 */
import type { InferredColumnType } from "./types.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DMY_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const YEAR_ONLY = /^\d{4}$/;

export function parseDateValue(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (ISO_DATE.test(s)) return s;
  const dmy = s.match(DMY_DATE);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    const yyyy = dmy[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  if (YEAR_ONLY.test(s)) return `${s}-01-01`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export function inferColumnType(values: unknown[]): InferredColumnType {
  let numeric = 0;
  let dates = 0;
  let text = 0;
  let empty = 0;

  for (const v of values) {
    if (v == null || String(v).trim() === "") {
      empty++;
      continue;
    }
    const s = String(v).trim().replace(/,/g, "");
    if (/^-?\d+(\.\d+)?$/.test(s)) {
      numeric++;
      continue;
    }
    if (parseDateValue(v)) {
      dates++;
      continue;
    }
    text++;
  }

  const total = Math.max(1, values.length - empty);
  if (numeric / total >= 0.7) return "number";
  if (dates / total >= 0.5) return "date";
  return "text";
}

export function inferTypesForHeaders(
  headers: string[],
  rows: Record<string, unknown>[],
): Record<string, InferredColumnType> {
  const out: Record<string, InferredColumnType> = {};
  for (const h of headers) {
    out[h] = inferColumnType(rows.map((r) => r[h]));
  }
  return out;
}

export function extractYearFromValue(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isInteger(raw) && raw >= 1900 && raw <= 2100) return raw;
  const s = String(raw).trim();
  if (YEAR_ONLY.test(s)) return parseInt(s, 10);
  const d = parseDateValue(raw);
  if (d) return parseInt(d.slice(0, 4), 10);
  const n = Number(s.replace(/,/g, ""));
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) return n;
  return null;
}
