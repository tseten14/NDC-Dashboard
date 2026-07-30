/**
 * The expected shape of an import inspection report.
 *
 * When a file is uploaded it is inspected before anything is saved. This defines
 * what that inspection reports back: what was found in the file, and what
 * quality problems were spotted, so the user can review both before confirming.
 */
import { z } from "zod";

export const ingestQcSchema = z.object({
  rows_input: z.number().optional(),
  rows_used_for_charts: z.number().optional(),
  rows_dropped_non_national: z.number().optional(),
  duplicate_key_rows: z.number().optional(),
  value_coercion_failures: z.number().optional(),
  files_repaired_non_strict: z.number().optional(),
});

/** PDF/text narrative + tabular chart payloads from ingestInsights. */
const ingestInsightsBlock = z.record(z.unknown());

export const ingestFileReportSchema = z
  .object({
    filename: z.string(),
    size_bytes: z.number().optional(),
    mime: z.string().optional(),
    extension: z.string().optional(),
    kind: z.string().optional(),
    rows: z.number().optional(),
    pages: z.number().optional(),
    lines: z.number().optional(),
    non_empty_lines: z.number().optional(),
    words: z.number().optional(),
    chars: z.number().optional(),
    keys: z.array(z.string()).optional(),
    preview: z.string().optional(),
    sample: z.unknown().optional(),
    error: z.string().optional(),
    warnings: z.array(z.string()).optional(),
    parse_mode: z.string().optional(),
    parse_engine: z.string().optional(),
    analysis_engine: z.string().optional(),
    pandas_version: z.string().optional(),
    keywords: z.record(z.array(z.string())).optional(),
    parse_errors: z.array(z.record(z.unknown())).optional(),
    about: ingestInsightsBlock.optional(),
    analysis: ingestInsightsBlock.optional(),
    recommendations: z.array(z.string()).optional(),
    columns: z.array(z.record(z.unknown())).optional(),
    validation: ingestInsightsBlock.optional(),
    qc: ingestQcSchema.optional(),
  })
  .passthrough();

export const ingestScanReportSchema = z.object({
  report_id: z.string(),
  generated_at: z.string(),
  duration_ms: z.number(),
  summary: z.object({
    files_received: z.number(),
    files_ok: z.number(),
    files_failed: z.number(),
    total_warnings: z.number(),
    keyword_buckets: z.record(z.array(z.string())).optional(),
    json_mode: z.enum(["strict", "repair"]).optional(),
    qc: ingestQcSchema.optional(),
  }),
  files: z.array(ingestFileReportSchema),
  limits: z
    .object({
      max_files: z.number(),
      max_bytes_per_file: z.number(),
      allowed_extensions: z.array(z.string()),
    })
    .optional(),
});
