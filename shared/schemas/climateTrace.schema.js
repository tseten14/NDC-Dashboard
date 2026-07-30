/**
 * The expected shape of Climate TRACE's replies.
 *
 * Climate TRACE is an outside service that can change without warning. These
 * definitions describe exactly what its responses should contain, and every
 * reply is checked against them before use. If the format ever shifts, the app
 * fails loudly at the point of the change rather than quietly displaying
 * whatever it received.
 */
import { z } from "zod";

export const climateTraceSummarySchema = z.object({
  sector: z.string().optional(),
  gas: z.string().optional(),
  emissionsQuantity: z.number().nullable().optional(),
  percentage: z.number().nullable().optional(),
});

export const climateTraceEmissionsResponseSchema = z.object({
  totals: z
    .object({
      summaries: z.array(climateTraceSummarySchema).optional(),
    })
    .optional(),
  sectors: z
    .object({
      summaries: z.array(climateTraceSummarySchema).optional(),
    })
    .optional(),
  location: z.unknown().optional(),
});

export const climateTraceRankingRowSchema = z.object({
  country: z.string(),
  emissionsQuantity: z.number().nullable().optional(),
  rank: z.number().nullable().optional(),
  emissionsPercentChange: z.number().nullable().optional(),
  emissionsPerCapita: z.number().nullable().optional(),
});

export const climateTraceRankingsResponseSchema = z.object({
  rankings: z.array(climateTraceRankingRowSchema).optional(),
});

export const climateTraceSourceSchema = z.object({
  id: z.union([z.number(), z.string()]).nullable().optional(),
  name: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  subsector: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  assetType: z.string().nullable().optional(),
  sourceType: z.string().nullable().optional(),
  centroid: z
    .object({
      longitude: z.number().nullable().optional(),
      latitude: z.number().nullable().optional(),
      srid: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  gas: z.string().nullable().optional(),
  emissionsQuantity: z.number().nullable().optional(),
  year: z.union([z.number(), z.string()]).nullable().optional(),
});

/** GET /v7/sources returns a flat array of source rows (asset-level + gadm-aggregation). */
export const climateTraceSourcesResponseSchema = z.array(climateTraceSourceSchema);
