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
import { enrichCitationsFromFacts } from "../services/dashboardAiCitations.js";

const router = express.Router();
const analysisCache = new NodeCache({ stdTTL: 1800 });

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MAX_CONTEXT_CHARS = 24_000;

class QuotaError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "QuotaError";
  }
}

async function callOpenAI(apiKey, systemText, userText) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemText },
          { role: "user", content: userText },
        ],
        max_tokens: 2800,
        temperature: 0.25,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const msg = errBody?.error?.message ?? `HTTP ${res.status}`;
      if (res.status === 429) {
        throw new QuotaError("The AI service rate limit has been reached. Please wait a moment and try again.");
      }
      throw new Error(`OpenAI ${res.status}: ${msg}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}

const ACTION_PROMPTS = {
  progress_check:
    "Write 3–4 prose sections on the selected NDC target. Use ONLY numbers from context.quotable_facts. Each paragraph refs must list fact ids for every number you mention.",
  gap_analysis:
    "Write 3–4 prose sections comparing Climate TRACE measurements to the NDC pledge. Cite fact_trace_* for observed values and fact_ndc_* for pledge values — never mix them on one ref list incorrectly.",
  sector_emissions:
    "Write 3–4 prose sections on sector emissions and trends. Every numeric claim must match a fact in context.quotable_facts and cite that fact id.",
  priorities:
    "Write 3–4 prose sections ranking targets by risk. Only use numbers from context.quotable_facts with matching fact id refs.",
};

const SYSTEM_PROMPT = `You are a plain-language climate analyst for Uganda's NDC Dashboard.

You receive JSON with live dashboard data plus a fact_ledger: every number you may quote is pre-listed with an exact id, value, and verified source URL.

Write like Perplexity: prose paragraphs with precise inline citations — each paragraph cites ONLY the fact ids backing the numbers in THAT paragraph.

Respond ONLY with valid JSON:

{
  "title": "<short answer title, max 8 words>",
  "confidence": "high" | "medium" | "low",
  "sections": [
    {
      "heading": "<section heading>",
      "lines": [
        {
          "text": "<one prose paragraph: 2–3 sentences, 40–80 words>",
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
- 3–5 sections, 1–2 paragraphs each, no bullet lists.
- confidence is "high" only when all numbers map to quotable_facts.
- Return JSON only — no markdown fences.`;

function buildUserMessage({ action, question, context }) {
  const contextJson = JSON.stringify(context, null, 2);
  const trimmed =
    contextJson.length > MAX_CONTEXT_CHARS
      ? `${contextJson.slice(0, MAX_CONTEXT_CHARS)}\n…[context truncated]`
      : contextJson;

  const taskLine = question
    ? `User question: "${question}"`
    : ACTION_PROMPTS[action] ?? ACTION_PROMPTS.progress_check;

  return `Task: ${taskLine}\n\n--- DASHBOARD CONTEXT (JSON) ---\n${trimmed}`;
}

router.post("/dashboard/analyze", async (req, res) => {
  const { action, question, context } = req.body ?? {};

  if (!context || typeof context !== "object") {
    return res.status(400).json({ error: "context object is required" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI analysis is not available on this server (OPENAI_API_KEY not set).",
    });
  }

  const cacheKey = question
    ? `dash:v2:chat:${question.slice(0, 80)}:${context.selected_target?.id ?? "none"}:${context.geography}`
    : `dash:v2:${action ?? "progress_check"}:${context.selected_target?.id ?? "none"}:${context.geography}`;

  const cached = analysisCache.get(cacheKey);
  if (cached) return res.json({ ...cached, from_cache: true });

  try {
    const userMessage = buildUserMessage({ action, question, context });
    const raw = await callOpenAI(process.env.OPENAI_API_KEY, SYSTEM_PROMPT, userMessage);

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
    req.log?.error({ err }, "dashboard_ai_analyze_failed");
    if (err.name === "QuotaError") {
      return res.status(429).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

export default router;
