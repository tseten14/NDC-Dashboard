import { z } from "zod";

export const pathwayNodeKindSchema = z.enum([
  "intervention",
  "attribute",
  "behaviour",
  "aggregate",
  "shift",
  "outcome",
]);

export const pathwayNodeSchema = z.object({
  id: z.string(),
  kind: pathwayNodeKindSchema,
  label: z.string(),
  documentHints: z.array(z.string()).optional(),
});

export const pathwayEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const tefChainSchema = z.object({
  nodes: z.array(pathwayNodeSchema),
  edges: z.array(pathwayEdgeSchema),
});

export const outcomeCategorySchema = z.enum([
  "jobs",
  "gdp",
  "inequality",
  "gender",
  "equity",
  "trade",
  "productivity",
  "emissions",
  "land_use",
  "biodiversity",
  "public_finance",
  "health",
  "energy_access",
]);

export const outcomeDirectionSchema = z.enum(["increase", "decrease", "ambiguous"]);

export const outcomeMagnitudeSchema = z.object({
  value: z.number(),
  unit: z.string(),
  low: z.number().optional(),
  high: z.number().optional(),
});

export const outcomeSchema = z.object({
  id: z.string(),
  category: outcomeCategorySchema,
  direction: outcomeDirectionSchema,
  description: z.string(),
  magnitude: outcomeMagnitudeSchema.optional(),
  confidence: z.number().min(0).max(1),
  evidence_refs: z.array(z.string()),
});

export const tradeOffSchema = z.object({
  id: z.string(),
  positive_effect: z.string(),
  negative_effect: z.string(),
  affected_groups: z.array(z.string()),
  severity: z.enum(["low", "medium", "high"]).optional(),
  confidence: z.number().min(0).max(1),
});

export const policyCaseSourceSchema = z.object({
  title: z.string(),
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  section: z.string().optional(),
});

export const policyCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  country: z.string(),
  region: z.string(),
  sector: z.string(),
  intervention_type: z.string(),
  description: z.string(),
  methodology: z.string(),
  assumptions: z.array(z.string()),
  limitations: z.array(z.string()),
  sources: z.array(policyCaseSourceSchema),
  intervention: z.object({
    type: z.string(),
    parameters: z.record(z.union([z.number(), z.string()])),
  }),
  tef_chain: tefChainSchema,
  outcomes: z.array(outcomeSchema),
  trade_offs: z.array(tradeOffSchema),
});

export const policyCaseIndexEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  country: z.string(),
  sector: z.string(),
  intervention_type: z.string(),
  summary: z.string(),
});

export const policyCaseIndexSchema = z.object({
  version: z.string(),
  description: z.string(),
  source: z.string(),
  cases: z.array(policyCaseIndexEntrySchema),
});

export const forecastRequestSchema = z.object({
  objective: z.string().min(1),
  intervention: z.object({
    type: z.string().min(1),
    label: z.string().optional(),
  }),
  parameters: z.object({
    scale: z.number().min(0).max(2).default(1),
    timeline_years: z.number().min(1).max(30).default(10),
    sector: z.string().min(1),
  }),
  context: z
    .object({
      country: z.string().default("UGA"),
    })
    .optional(),
});

export const forecastImpactSchema = z.object({
  category: outcomeCategorySchema,
  direction: outcomeDirectionSchema,
  description: z.string(),
  magnitude: outcomeMagnitudeSchema.optional(),
  confidence: z.number(),
  provenance: z.string(),
  case_ids: z.array(z.string()),
});

export const forecastResponseSchema = z.object({
  impacts: z.array(forecastImpactSchema),
  trade_offs: z.array(
    tradeOffSchema.extend({
      provenance: z.string().optional(),
      case_ids: z.array(z.string()).optional(),
    }),
  ),
  pathway_diagram: tefChainSchema,
  matched_cases: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      match_score: z.number(),
      country: z.string(),
      sector_score: z.number().optional(),
      intervention_score: z.number().optional(),
      region_score: z.number().optional(),
      scale_score: z.number().optional(),
    }),
  ),
  overall_confidence: z.number(),
  disclaimers: z.array(z.string()),
  data_source: z.string(),
});
