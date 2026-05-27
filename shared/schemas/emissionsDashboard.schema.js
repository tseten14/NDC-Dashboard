import { z } from "zod";

const sectorStatusSchema = z.enum(["on_track", "at_risk", "mixed", "off_track", "unknown"]);

export const timeseriesPointSchema = z.object({
  year: z.number(),
  value: z.number().nullable(),
});

export const progressResponseSchema = z.object({
  sector: z.string(),
  unit: z.string().optional(),
  label: z.string().optional(),
  condition: z.string().optional(),
  baseline_year: z.number(),
  baseline_value: z.number(),
  target_year: z.number(),
  target_value: z.number(),
  latest_year: z.number().nullable(),
  latest_value: z.number().nullable(),
  progress_pct: z.number().nullable(),
  status: sectorStatusSchema,
  data_source: z.string().optional(),
  methodology: z.string().optional(),
  scope_note: z.string().nullable().optional(),
  trace_yoy_pct: z.number().nullable().optional(),
  baseline_vs_trace_delta_mt: z.number().nullable().optional(),
  missing_slugs: z.array(z.string()).optional(),
});

export const sectorSummarySchema = z.object({
  latest_year: z.number().nullable(),
  latest_value: z.number().nullable(),
  status: sectorStatusSchema,
  progress_pct: z.number().nullable(),
});

export const reconciliationSchema = z.object({
  reference_year: z.number(),
  country_total_mt: z.number().nullable(),
  sector_sum_mt: z.number().nullable(),
  ui_sector_sum_mt: z.number().nullable(),
  delta_mt: z.number().nullable(),
  unmapped_slugs: z.array(z.string()).optional(),
  missing_slugs: z.array(z.string()).optional(),
  slug_breakdown: z.record(z.number().nullable()).optional(),
  note: z.string().optional(),
});

export const emissionsDashboardSchema = z.object({
  since: z.number(),
  to: z.number(),
  inventory_year: z.number(),
  on_track: z.number(),
  off_track: z.number(),
  mixed: z.number(),
  impl_gaps: z.number().optional(),
  mrv_gaps: z.number().optional(),
  global_rank: z.number().nullable(),
  total_co2e_mtco2e: z.number().nullable(),
  yoy_change_mtco2e: z.number().nullable(),
  data_stale: z.boolean(),
  from_cache: z.boolean(),
  data_source: z.string(),
  api_docs_url: z.string().optional(),
  timeseries: z.record(z.array(timeseriesPointSchema)),
  progress: z.record(progressResponseSchema),
  sectors: z.record(sectorSummarySchema),
  slug_breakdown_by_sector: z.record(z.unknown()).optional(),
  reconciliation: reconciliationSchema.optional(),
  coverage: z.record(z.unknown()).optional(),
});
