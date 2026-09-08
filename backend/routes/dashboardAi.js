/**
 * POST /api/v1/dashboard/analyze
 *
 * OpenAI-backed Q&A over the NDC dashboard context (Climate TRACE + NDC targets).
 * The client sends a structured snapshot of the current dashboard view.
 *
 * Requires: OPENAI_API_KEY
 */
import express from "express";
import NodeCache from "node-cache";
import { z } from "zod";
import { enrichCitationsFromFacts } from "../services/dashboardAiCitations.js";
import { completeChat, QuotaError } from "../services/openaiChat.js";
import { sendClientError, sendServerError } from "../server/errors.js";

const router = express.Router();
const analysisCache = new NodeCache({ stdTTL: 1800 });

const MAX_CONTEXT_CHARS = 12_000;

const ACTION_PROMPTS = {
  progress_check:
    "Write 2–3 short prose sections on the selected NDC target. Use ONLY numbers from context.quotable_facts. Each paragraph refs must list fact ids for every number you mention.",
  gap_analysis:
    "Write 2–3 short prose sections comparing Climate TRACE measurements to the NDC pledge. Cite fact_trace_* for observed values and fact_ndc_* for pledge values — never mix them on one ref list incorrectly.",
  sector_emissions:
    "Write 2–3 short prose sections on sector emissions and trends. Every numeric claim must match a fact in context.quotable_facts and cite that fact id.",
  priorities:
    "Write 2–3 short prose sections ranking targets by risk. Only use numbers from context.quotable_facts with matching fact id refs.",
};

const SYSTEM_PROMPT = `You are a plain-language climate analyst for Uganda's NDC Dashboard.

You receive compact JSON plus a fact_ledger: every number you may quote is pre-listed with an exact id, value, and verified source URL.

Write short prose paragraphs with precise inline citations — each paragraph cites ONLY the fact ids backing the numbers in THAT paragraph.

Respond ONLY with valid JSON:

{
  "title": "<short answer title, max 8 words>",
  "confidence": "high" | "medium" | "low",
  "sections": [
    {
      "heading": "<section heading>",
      "lines": [
        {
          "text": "<one prose paragraph: 1–2 sentences, 25–45 words>",
          "refs": ["<fact id from context.quotable_facts or fact_ledger — one per number cited>"]
        }
      ]
    }
  ],
  "disclaimer": "<one sentence, max 25 words>",
  "suggested_follow_ups": ["<question 1>", "<question 2>"]
}

Critical rules:
- ONLY use numbers that appear in context.quotable_facts (value field). Never invent, round differently, or estimate.
- Every number in text MUST have a matching fact id in refs for that paragraph.
- refs must be copied exactly from context.fact_ledger[].id (e.g. fact_trace_afolu_latest_2024, fact_ndc_t1_baseline, fact_ndc_t1_target).
- Climate TRACE emissions → fact_trace_* ids. NDC baselines/targets/BAU → fact_ndc_* ids.
- Do NOT cite generic sources (unfccc, CPR, dashboard). Cite the specific fact id.
- If data is missing from quotable_facts, say it is unavailable — do not guess.
- 2–3 sections, 1 paragraph each, no bullet lists.
- confidence is "high" only when all numbers map to quotable_facts.
- Return JSON only — no markdown fences.`;

function slimDashboardContext(context) {
  const sectorsIn = context.climate_trace?.sectors;
  const sectors = {};
  if (sectorsIn && typeof sectorsIn === "object") {
    for (const [key, value] of Object.entries(sectorsIn)) {
      if (!value || typeof value !== "object") continue;
      sectors[key] = {
        latest_year: value.latest_year,
        latest_value_mt: value.latest_value_mt,
        progress_pct: value.progress_pct,
        status: value.status,
        target_value_mt: value.target_value_mt,
        bau_2030_mt: value.bau_2030_mt,
      };
    }
  }
  return {
    geography: context.geography,
    district_name: context.district_name,
    selected_sector: context.selected_sector,
    selected_target: context.selected_target,
    selected_target_progress: context.selected_target_progress,
    all_targets_summary: context.all_targets_summary,
    climate_trace: {
      inventory_years: context.climate_trace?.inventory_years,
      api_reachable: context.climate_trace?.api_reachable,
      sectors,
      reconciliation: context.climate_trace?.reconciliation,
    },
    fact_ledger: context.fact_ledger,
    quotable_facts: context.quotable_facts,
  };
}

function buildUserMessage({ action, question, context }) {
  const contextJson = JSON.stringify(slimDashboardContext(context));
  const trimmed =
    contextJson.length > MAX_CONTEXT_CHARS
      ? `${contextJson.slice(0, MAX_CONTEXT_CHARS)}\n…[context truncated]`
      : contextJson;

  const taskLine = question
    ? `User question: "${question}"`
    : ACTION_PROMPTS[action] ?? ACTION_PROMPTS.progress_check;

  return `Task: ${taskLine}\n\n--- DASHBOARD CONTEXT (JSON) ---\n${trimmed}`;
}

/**
 * What the client is allowed to send.
 *
 * This endpoint spends money on every call that misses the cache, so the input
 * is pinned down rather than passed through: `action` must be one of the four
 * known buttons, the free-text question is length-capped, and the dashboard
 * snapshot must be a plain object. Without the cap a caller could paste an
 * essay and have it billed as prompt tokens.
 */
const requestSchema = z.object({
  action: z.enum(["progress_check", "gap_analysis", "sector_emissions", "priorities"]).optional(),
  question: z.string().trim().min(1).max(500).optional(),
  context: z.record(z.unknown()),
});

router.post("/dashboard/analyze", async (req, res) => {
  const parsedRequest = requestSchema.safeParse(req.body ?? {});
  if (!parsedRequest.success) {
    return sendClientError(res, 400, "invalid_request", "Provide a dashboard context and an optional action or question.");
  }
  const { action, question, context } = parsedRequest.data;

  if (!process.env.OPENAI_API_KEY) {
    return sendClientError(res, 503, "ai_unavailable", "AI analysis is not configured on this server.");
  }

  const cacheKey = question
    ? `dash:v3:chat:${question.slice(0, 80)}:${context.selected_target?.id ?? "none"}:${context.geography}`
    : `dash:v3:${action ?? "progress_check"}:${context.selected_target?.id ?? "none"}:${context.geography}`;

  const cached = analysisCache.get(cacheKey);
  if (cached) return res.json({ ...cached, from_cache: true });

  try {
    const userMessage = buildUserMessage({ action, question, context });
    const raw = await completeChat({
      apiKey: process.env.OPENAI_API_KEY,
      systemText: SYSTEM_PROMPT,
      userText: userMessage,
      maxTokens: 900,
    });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const stripped = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(stripped);
    }

    const enriched = enrichCitationsFromFacts(parsed, context);
    const confidence =
      enriched.has_unverified_numbers
        ? "low"
        : enriched.confidence ?? "medium";
    const result = {
      type: question ? "chat" : action ?? "progress_check",
      title: enriched.title ?? "Dashboard analysis",
      sections: enriched.sections ?? [],
      sources: enriched.sources ?? [],
      confidence,
      disclaimer:
        enriched.disclaimer ??
        (enriched.has_unverified_numbers
          ? "Some figures could not be matched to verified dashboard facts — treat with caution."
          : "Figures are tied to Climate TRACE API and UNFCCC NDC sources listed in citations."),
      suggested_follow_ups: enriched.suggested_follow_ups ?? [],
    };

    analysisCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    // The quota message is written by this file, so it is safe to show. Any
    // other failure may quote the upstream provider's response, which can
    // include account and organisation details, so it stays in the log.
    if (err.name === "QuotaError") {
      req.log?.warn({ event: "dashboard_ai_quota" }, "AI provider rate limit reached");
      return sendClientError(res, 429, "ai_rate_limited", err.message);
    }
    return sendServerError(req, res, err, "dashboard_ai_analyze_failed", {
      status: 502,
      code: "ai_analysis_failed",
      message: "The analysis could not be completed. Please try again.",
    });
  }
});

export default router;
