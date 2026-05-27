import type { ColumnMapping, ObservationField } from "./types.js";

const FIELD_PATTERNS: Record<ObservationField, RegExp[]> = {
  year: [/^(reporting_)?year$/i, /^date$/i, /^period(_end)?$/i, /^fiscal_?year$/i, /^time$/i],
  value: [/^(observed_)?value$/i, /^emissions?$/i, /^amount$/i, /^quantity$/i, /^mtco2/i, /^tco2/i, /^total$/i],
  source: [/^(data_)?source$/i, /^provider$/i, /^origin$/i, /^mrv$/i],
  target_id: [/^(target|indicator|sector)(_id|_code|_key)?$/i, /^kpi(_id)?$/i, /^slug$/i],
};

function scoreHeader(header: string, field: ObservationField): number {
  const h = header.trim().toLowerCase().replace(/\s+/g, "_");
  let best = 0;
  for (const re of FIELD_PATTERNS[field]) {
    if (re.test(h)) best = Math.max(best, 100);
    if (h.includes(field.replace("_", ""))) best = Math.max(best, 40);
  }
  if (field === "year" && /year|date|period/.test(h)) best = Math.max(best, 60);
  if (field === "value" && /value|emission|amount|mtco|tco2/.test(h)) best = Math.max(best, 60);
  if (field === "target_id" && /target|indicator|sector|kpi/.test(h)) best = Math.max(best, 50);
  return best;
}

/**
 * Heuristic column mapping for observations schema fields.
 * Returns null for target_id when multiple columns score similarly (ambiguous).
 */
export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const used = new Set<string>();

  const assignField = (field: ObservationField, allowAmbiguousNull = false) => {
    const scores = headers
      .filter((h) => !used.has(h))
      .map((h) => ({ header: h, score: scoreHeader(h, field) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!scores.length) {
      mapping[field] = null;
      return;
    }

    if (allowAmbiguousNull && scores.length > 1 && scores[0].score === scores[1].score) {
      mapping[field] = null;
      return;
    }

    if (field === "target_id" && scores.length > 1 && scores[0].score - scores[1].score < 20) {
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
