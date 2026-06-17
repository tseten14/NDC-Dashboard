/**
 * POST /api/v1/dashboard/analyze
 *
 * Grounded Q&A over Uganda's NDC dashboard. Four-stage Perplexity-style pipeline
 * (see CITATION_AUDIT.md and services/groundedCitations.js):
 *   1. Retrieve — Climate TRACE figures as search_result blocks + native web_search
 *      (Anthropic server tool) restricted to trusted climate domains.
 *   2. Ground   — Opus generation with Citations enabled (no structured output).
 *   3. Verify   — Haiku checks every snippet supports its claim (numbers included).
 *   4. Render   — frontend maps verified claims to external chips; unverified
 *      claims render a non-clickable "source unavailable" chip.
 *
 * Requires: ANTHROPIC_API_KEY
 */
import express from "express";
import NodeCache from "node-cache";
import Anthropic from "@anthropic-ai/sdk";
import {
  GENERATION_MODEL,
  WEB_SEARCH_TOOL_VERSION,
  ALLOWED_DOMAINS,
  buildSearchResultBlocks,
  parseGroundedSegments,
  verifySegments,
  serializeAnswer,
} from "../services/groundedCitations.js";

const router = express.Router();
const analysisCache = new NodeCache({ stdTTL: 1800 });

const MAX_CONTEXT_CHARS = 18_000;
const MAX_PAUSE_CONTINUATIONS = 4;

class QuotaError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "QuotaError";
  }
}

// The system prompt is the NDC AI grounding contract: every figure must come
// from a retrieved source, observed values cite Climate TRACE, targets cite
// UNFCCC/CPR, and missing figures stay missing.
const SYSTEM_PROMPT = `You are NDC AI, a research assistant embedded in the Uganda NDC Data Explorer. You answer questions about Uganda's Nationally Determined Contributions (NDC) targets and observed greenhouse gas emissions, by sector, against the 2030 pledge.

## Your single most important rule
Every factual claim you make — every number, target, trend, and "on track / off track" judgment — MUST be grounded in a source returned to you by the web search tool or provided as a search-result document. You do not have permission to state a figure from memory. If a number is not in your retrieved sources, you do not state it.

## Source grounding
- Only cite sources that were actually returned to you. Never construct, guess, or "remember" a URL.
- Never cite the dashboard, this app, or any internal page as a source. Sources are external: Climate TRACE, Climate Policy Radar, the UNFCCC NDC Registry, IEA, World Bank, Our World in Data, IPCC, and similar.
- Match the source type to the claim:
  - Observed / measured emissions → cite Climate TRACE (or the structured emissions data provided to you).
  - Targets, pledges, and policy commitments → cite the UNFCCC NDC Registry or Climate Policy Radar.
  - Context, methodology, or comparative figures → cite IEA, World Bank, OWID, or IPCC.
- Cite the most specific source that contains the figure. If a search result only broadly mentions a topic but does not contain the exact number, it does not support that number — keep searching or mark the claim unverified.

## When a source is missing or weak
- If you cannot find a real source that contains a specific figure, DO NOT invent one and DO NOT substitute a related-but-different number. State plainly that the value is currently unavailable or unverified.
- Never fill a gap with a plausible-sounding estimate. A missing number stays missing.
- It is better to return a shorter, fully-grounded answer than a complete-looking answer with unsupported claims.

## What this data is and isn't
- These are reported targets and observed/measured emissions with per-paragraph citations to public sources. They are NOT forecasts. Do not describe any figure as a projection unless the source explicitly labels it as one.
- When comparing observed emissions to a target, state the target, state the latest observed value, name the year of each, and only then give the "on track" / "ahead" / "behind" judgment.

## Units and precision
- Use consistent units (Mt CO₂e) and carry them on every figure.
- Report numbers as they appear in the source. Always state the year a figure refers to.

## Tone and structure
- Be concise, factual, and neutral. Lead with the direct answer, then the supporting comparison.
- Do not make policy recommendations. Group claims by sector when answering multi-sector questions.
- Attach a citation to each individual claim, not one citation dumped at the end. Keep claims atomic so each maps cleanly to one supporting source.
- Never present an uncited factual claim as if it were verified.

## If asked something outside scope
- If the question isn't about Uganda's NDC targets or emissions, briefly say it's outside what this tool covers.
- If asked to speculate or predict, clarify that this tool reports measured data and stated targets, not forecasts.`;

const ACTION_TASKS = {
  progress_check:
    "Assess how the currently selected NDC target is progressing: state its 2030 target, the latest observed value and its year, and whether it is on track. Cite each figure.",
  gap_analysis:
    "Compare Climate TRACE observed emissions against the NDC 2030 pledge for the selected sector(s). Cite observed values to Climate TRACE and pledge values to UNFCCC/CPR.",
  sector_emissions:
    "Summarise the Climate TRACE observed emissions trend for the selected sector, citing each value.",
  priorities:
    "Identify which NDC targets are furthest from their 2030 pledge, citing the observed and target figures for each.",
};

function buildTask({ action, question }) {
  if (question) return `User question: "${question}"`;
  return ACTION_TASKS[action] ?? ACTION_TASKS.progress_check;
}

/** Compact, model-facing summary of the dashboard selection (context, not a source). */
function buildContextNote(context) {
  const slim = {
    geography: context.geography,
    district_name: context.district_name,
    selected_sector: context.selected_sector,
    selected_target: context.selected_target,
    observed_latest: context.observed_latest,
    climate_trace_years: context.climate_trace?.inventory_years,
  };
  let json = JSON.stringify(slim, null, 2);
  if (json.length > MAX_CONTEXT_CHARS) json = `${json.slice(0, MAX_CONTEXT_CHARS)}\n…[truncated]`;
  return json;
}

/** Up to two follow-up questions derived from the dashboard (no model call needed). */
function buildFollowUps(context) {
  const out = [];
  const sel = context.selected_target?.summary;
  if (sel) out.push(`How does ${sel} compare to its 2030 pledge?`);
  const others = (context.all_targets_summary ?? [])
    .filter((t) => t.id !== context.selected_target?.id)
    .slice(0, 1);
  for (const t of others) out.push(`Is ${t.summary} on track for 2030?`);
  if (out.length < 2) out.push("Which sectors are furthest from their 2030 targets?");
  return out.slice(0, 2);
}

/** Stage 2 generation call with the web_search server tool + search_result blocks. */
async function generateGrounded(client, { task, contextNote, searchResults }) {
  const tools = [
    {
      type: WEB_SEARCH_TOOL_VERSION,
      name: "web_search",
      max_uses: 8,
      allowed_domains: ALLOWED_DOMAINS,
    },
  ];

  const userContent = [
    ...searchResults,
    {
      type: "text",
      text:
        `${task}\n\n` +
        `Use the search-result documents above for Climate TRACE observed figures, and the web_search tool for UNFCCC/CPR/IEA targets and context. ` +
        `Every number must carry a citation to a retrieved source.\n\n` +
        `--- DASHBOARD SELECTION (context only, NOT a citable source) ---\n${contextNote}`,
    },
  ];

  const messages = [{ role: "user", content: userContent }];

  // Server-tool loop: re-send on pause_turn until the model finishes.
  let response = await client.messages.create({
    model: GENERATION_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    tools,
    messages,
  });

  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < MAX_PAUSE_CONTINUATIONS) {
    messages.push({ role: "assistant", content: response.content });
    response = await client.messages.create({
      model: GENERATION_MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });
    continuations += 1;
  }

  return response;
}

router.post("/dashboard/analyze", async (req, res) => {
  const { action, question, context } = req.body ?? {};

  if (!context || typeof context !== "object") {
    return res.status(400).json({ error: "context object is required" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: "AI analysis is not available on this server (ANTHROPIC_API_KEY not set).",
    });
  }

  const cacheKey = question
    ? `dash:v3:chat:${question.slice(0, 80)}:${context.selected_target?.id ?? "none"}:${context.geography}`
    : `dash:v3:${action ?? "progress_check"}:${context.selected_target?.id ?? "none"}:${context.geography}`;

  const cached = analysisCache.get(cacheKey);
  if (cached) return res.json({ ...cached, from_cache: true });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Stage 1 — Retrieve
    const searchResults = buildSearchResultBlocks(context);
    const task = buildTask({ action, question });
    const contextNote = buildContextNote(context);

    // Stage 2 — Ground
    const response = await generateGrounded(client, { task, contextNote, searchResults });
    const segments = parseGroundedSegments(response);

    // Stage 3 — Verify
    await verifySegments(client, segments);

    // Stage 4 — Serialize
    const { answer_segments, unverified_claims, confidence } = serializeAnswer(segments);

    const result = {
      type: question ? "chat" : action ?? "progress_check",
      title: question ? truncateTitle(question) : titleForAction(action),
      answer_segments,
      unverified_claims,
      confidence,
      disclaimer:
        unverified_claims.length > 0
          ? "Some figures could not be matched to a verifiable external source and are marked “source unavailable”."
          : "Figures are grounded in cited external sources (Climate TRACE, UNFCCC NDC Registry, and others) — not forecasts.",
      suggested_follow_ups: buildFollowUps(context),
    };

    analysisCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    req.log?.error({ err }, "dashboard_ai_analyze_failed");
    if (err instanceof Anthropic.RateLimitError || err?.name === "QuotaError") {
      return res
        .status(429)
        .json({ error: "The AI service rate limit has been reached. Please wait a moment and try again." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(503).json({ error: "AI analysis is misconfigured (invalid ANTHROPIC_API_KEY)." });
    }
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

function truncateTitle(q) {
  const t = q.trim();
  return t.length > 60 ? `${t.slice(0, 57)}…` : t;
}

function titleForAction(action) {
  const map = {
    progress_check: "Progress check",
    gap_analysis: "Gap vs 2030 pledge",
    sector_emissions: "Sector emissions",
    priorities: "Top priorities",
  };
  return map[action] ?? "Dashboard analysis";
}

export default router;
