/**
 * safeParse wrapper — logs schema failures with payload snippet for ops debugging.
 */

/**
 * @template T
 * @param {import('zod').ZodType<T>} schema
 * @param {unknown} data
 * @param {string} label
 * @returns {{ ok: true, data: T } | { ok: false, data: null, error: import('zod').ZodError }}
 */
export function safeParseOrLog(schema, data, label) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  let snippet = "";
  try {
    snippet = JSON.stringify(data).slice(0, 800);
  } catch {
    snippet = String(data).slice(0, 800);
  }
  console.error(`[schema:${label}] validation failed`, {
    issues: result.error.issues,
    payload_snippet: snippet,
  });
  return { ok: false, data: null, error: result.error };
}
