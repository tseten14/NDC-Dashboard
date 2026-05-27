import { z } from "zod";

export const indicatorPanelMetaSchema = z.object({
  targetId: z.string(),
  baselineYear: z.number(),
  baselineValue: z.number().nullable(),
  targetYear: z.number(),
  targetValue: z.number().nullable(),
  unit: z.string(),
  dataProviders: z.array(z.string()),
  sourceType: z.string(),
  mrvOwnerMinistry: z.string(),
  qaqcStatus: z.string(),
  isValidated: z.boolean(),
  lastUpdated: z.string(),
});

export const indicatorPanelEntrySchema = z.object({
  meta: indicatorPanelMetaSchema,
  timeseries: z.array(
    z.object({
      year: z.number(),
      value: z.number().nullable(),
    }),
  ),
});

export const indicatorPanelResponseSchema = z.object({
  since: z.number(),
  to: z.number(),
  targets: z.record(indicatorPanelEntrySchema),
  data_source: z.string(),
});
