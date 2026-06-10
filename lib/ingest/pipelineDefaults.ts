import type { ColumnMapping, InferredColumnType } from "./types.js";
import type { PipelineFilterOptions } from "./pipelineClean.js";

function findHeader(headers: string[], pattern: RegExp): string | null {
  return headers.find((h) => pattern.test(h.trim())) ?? null;
}

function isTextLikeValueColumn(header: string, inferredTypes?: Record<string, InferredColumnType>): boolean {
  const h = header.trim().toLowerCase().replace(/\s+/g, "_");
  if (/name$|title$|summary$|url$|content$|phrase$|language$|type$/.test(h)) return true;
  if (inferredTypes?.[header] === "text" || inferredTypes?.[header] === "date") return true;
  return false;
}

function pickNumericValueColumn(
  headers: string[],
  inferredTypes?: Record<string, InferredColumnType>,
): string | null {
  for (const h of headers) {
    if (isTextLikeValueColumn(h, inferredTypes)) continue;
    const lc = h.toLowerCase();
    if (inferredTypes?.[h] === "number" || /value|amount|emission|mtco|quantity|reduction|hectare|budget/.test(lc)) {
      return h;
    }
  }
  return null;
}

/** Policy document exports from Climate Policy Radar and similar catalogs. */
export function isPolicyCatalogFile(headers: string[]): boolean {
  const hasGeo = headers.some((h) => /geograph/i.test(h));
  const hasDate = headers.some((h) => /publication.*date|family.*date/i.test(h));
  const hasCategory = headers.some((h) => /^category$/i.test(h.trim()));
  return hasGeo && hasDate && hasCategory;
}

/**
 * Defaults for policy catalogs and sensible fallbacks for indicator CSVs.
 * Policy: Family Publication Date, Category, Source, document count, Uganda filter.
 */
export function applyPipelineDefaults(
  headers: string[],
  mapping: ColumnMapping,
  inferredTypes?: Record<string, InferredColumnType>,
): { mapping: ColumnMapping; filters: PipelineFilterOptions; fileKind: "policy_catalog" | "indicator" } {
  const policy = isPolicyCatalogFile(headers);

  if (policy) {
    return {
      fileKind: "policy_catalog",
      mapping: {
        year:
          mapping.year ??
          findHeader(headers, /family\s*publication\s*date/i) ??
          findHeader(headers, /publication.*date/i),
        value: null,
        target_id: mapping.target_id ?? findHeader(headers, /^category$/i),
        source: mapping.source ?? findHeader(headers, /^source$/i),
      },
      filters: {
        ugandaOnly: true,
        dropDuplicates: true,
        latestYearOnly: false,
        documentCountMode: true,
      },
    };
  }

  const numericValue = mapping.value;
  const safeValue =
    numericValue && !isTextLikeValueColumn(numericValue, inferredTypes) ? numericValue : pickNumericValueColumn(headers, inferredTypes);

  return {
    fileKind: "indicator",
    mapping: { ...mapping, value: safeValue ?? null },
    filters: {
      ugandaOnly: Boolean(headers.some((h) => /geograph|country|region/i.test(h))),
      dropDuplicates: true,
      latestYearOnly: false,
      documentCountMode: !safeValue,
    },
  };
}
