import type { ColumnMapping, InferredColumnType, ObservationField } from "./types.js";

const FIELD_PATTERNS: Record<ObservationField, RegExp[]> = {
  year: [
    /^(reporting_)?year$/i,
    /^date$/i,
    /publication[_\s]?date/i,
    /^period(_end)?$/i,
    /^fiscal_?year$/i,
    /^time$/i,
    /^inventory_year$/i,
  ],
  value: [
    /^(observed_)?value$/i,
    /^emissions?$/i,
    /^amount$/i,
    /^quantity$/i,
    /^mtco2/i,
    /^tco2/i,
    /^total$/i,
    /^reduction$/i,
    /^target[_\s]?value$/i,
  ],
  source: [/^(data_)?source$/i, /^provider$/i, /^origin$/i, /^mrv$/i, /^publisher$/i],
  target_id: [
    /^(target|indicator|sector)(_id|_code|_key)?$/i,
    /^kpi(_id)?$/i,
    /^slug$/i,
    /^category$/i,
    /^document[_\s]?type$/i,
    /^family[_\s]?name$/i,
  ],
};

function scoreHeader(
  header: string,
  field: ObservationField,
  inferredTypes?: Record<string, InferredColumnType>,
): number {
  const h = header.trim().toLowerCase().replace(/\s+/g, "_");
  let best = 0;
  for (const re of FIELD_PATTERNS[field]) {
    if (re.test(h)) best = Math.max(best, 100);
  }
  if (field === "year") {
    if (/year|date|period|publication/.test(h)) best = Math.max(best, 70);
    if (inferredTypes?.[header] === "date") best = Math.max(best, 95);
    if (/name$/.test(h) && !/date|year|period/.test(h)) best = 0;
  }
  if (field === "value") {
    if (/value|emission|amount|mtco|tco2|reduction/.test(h)) best = Math.max(best, 70);
    if (inferredTypes?.[header] === "number") best = Math.max(best, 85);
    if (/name$|title$|summary$|url$/.test(h)) best = 0;
  }
  if (field === "source" && /source|publisher|provider/.test(h)) best = Math.max(best, 70);
  if (field === "target_id" && h === "category") best = Math.max(best, 110);
  if (field === "target_id" && /target|indicator|sector|kpi|category/.test(h)) best = Math.max(best, 55);
  return best;
}

/**
 * Heuristic column mapping for observations schema fields.
 * Returns null for target_id when multiple columns score similarly (ambiguous).
 */
export function suggestColumnMapping(
  headers: string[],
  inferredTypes?: Record<string, InferredColumnType>,
): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  const assignField = (field: ObservationField, allowAmbiguousNull = false) => {
    const scores = headers
      .filter((h) => !used.has(h))
      .map((h) => ({ header: h, score: scoreHeader(h, field, inferredTypes) }))
      .filter((x) => x.score >= 55)
      .sort((a, b) => b.score - a.score);

    if (!scores.length) {
      mapping[field] = null;
      return;
    }

    if (allowAmbiguousNull && scores.length > 1 && scores[0].score === scores[1].score) {
      mapping[field] = null;
      return;
    }

    if (
      field === "target_id" &&
      scores.length > 1 &&
      scores[0].score - scores[1].score < 10
    ) {
      mapping[field] = null;
      return;
    }

    mapping[field] = scores[0].header;
    used.add(scores[0].header);
  };

  assignField("year");
  assignField("value");
  assignField("source");
  assignField("target_id", true);

  return mapping;
}

export function mappingIsValidForImport(mapping: ColumnMapping): boolean {
  return Boolean(mapping.year && mapping.value);
}
