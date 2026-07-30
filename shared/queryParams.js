/**
 * Reads and checks values from a web address.
 *
 * When a screen asks for "emissions from 2015 to 2025", those years arrive as
 * text on the end of a URL and could be anything at all. These helpers turn them
 * into numbers, confirm they fall in a sensible range, and reject the request
 * clearly if not — so a bad address produces a helpful error rather than a
 * strange-looking chart.
 */
import { INVENTORY_YEAR_MIN, latestInventoryYear } from "../config/climateTrace.js";

/**
 * Parse a single inventory year from a query string.
 * Returns { value } or { error }.
 */
export function parseInventoryYear(raw, options = {}) {
  const minYear = options.minYear ?? INVENTORY_YEAR_MIN;
  const maxYear = options.maxYear ?? latestInventoryYear();

  if (raw == null || raw === "") {
    return { error: `year is required and must be an integer between ${minYear} and ${maxYear}` };
  }

  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || String(n) !== String(raw).trim()) {
    return { error: `year must be an integer between ${minYear} and ${maxYear}` };
  }
  if (n < minYear || n > maxYear) {
    return { error: `year must be an integer between ${minYear} and ${maxYear}` };
  }
  return { value: n };
}

/**
 * Parse optional inventory year; returns defaultValue when raw is absent.
 */
export function parseOptionalInventoryYear(raw, defaultValue, options = {}) {
  if (raw == null || raw === "") return { value: defaultValue };
  return parseInventoryYear(raw, options);
}

/**
 * Parse since/to inventory range from query params.
 * Returns { since, to } or { error }.
 */
export function parseInventoryRange(query, options = {}) {
  const minYear = options.minYear ?? INVENTORY_YEAR_MIN;
  const maxYear = options.maxYear ?? latestInventoryYear();
  const defaultSince = options.defaultSince ?? minYear;
  const defaultTo = options.defaultTo ?? maxYear;

  const sinceResult =
    query.since != null && query.since !== ""
      ? parseInventoryYear(query.since, { minYear, maxYear })
      : { value: defaultSince };
  if (sinceResult.error) return sinceResult;

  const toResult =
    query.to != null && query.to !== ""
      ? parseInventoryYear(query.to, { minYear, maxYear })
      : { value: defaultTo };
  if (toResult.error) return toResult;

  if (sinceResult.value > toResult.value) {
    return { error: `since (${sinceResult.value}) must be <= to (${toResult.value})` };
  }

  return { since: sinceResult.value, to: toResult.value };
}

/**
 * Parse positive integer limit/offset with optional caps.
 */
export function parsePositiveInt(raw, defaultValue, { max } = {}) {
  if (raw == null || raw === "") return defaultValue;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 0 || String(n) !== String(raw).trim()) return null;
  if (max != null && n > max) return max;
  return n;
}
