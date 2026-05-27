import { z } from "zod";

export const climateTraceSummarySchema = z.object({
  gas: z.string().optional(),
  emissionsQuantity: z.number().nullable().optional(),
});

export const climateTraceEmissionsResponseSchema = z.object({
  totals: z
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
