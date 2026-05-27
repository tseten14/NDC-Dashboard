import { z } from "zod";

export const ingestQcSchema = z.object({
  rows_input: z.number().optional(),
  rows_used_for_charts: z.number().optional(),
  rows_dropped_non_national: z.number().optional(),
  duplicate_key_rows: z.number().optional(),
  value_coercion_failures: z.number().optional(),
  files_repaired_non_strict: z.number().optional(),
});

export const ingestFileReportSchema = z.object({
  filename: z.string(),
  size_bytes: z.number().optional(),
  kind: z.string().optional(),
  rows: z.number().optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  parse_mode: z.string().optional(),
  analysis_engine: z.string().optional(),
  qc: ingestQcSchema.optional(),
});

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
