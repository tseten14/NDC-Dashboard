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
    "Explain how the currently selected NDC target is progressing — use measured Climate TRACE data vs the pledge. One clear section on status, one on what the numbers mean for a non-specialist.",
  gap_analysis:
    "Compare latest measured values to the NDC pledge (and baseline where relevant). Quantify the gap in plain language and say whether Uganda is ahead or behind on the selected target.",
  sector_emissions:
    "Summarize Climate TRACE emissions for the selected sector and geography: latest level, recent trend, and how it relates to the NDC target.",
  priorities:
    "Across all targets in the context, which 3–4 need the most attention and why? Rank by delivery risk and data gaps.",
};

const SYSTEM_PROMPT = `You are a plain-language climate analyst for Uganda's NDC Dashboard.

You receive a JSON snapshot of the live dashboard: NDC targets, Climate TRACE observed emissions, progress percentages, geography (national or district), and reconciliation notes.

Respond ONLY with valid JSON:

{
  "title": "<short answer title, max 8 words>",
  "confidence": "high" | "medium" | "low",
  "sections": [
    {
      "heading": "<section heading>",
      "lines": [
        {
          "text": "<one rich sentence per bullet>",
          "refs": ["<1–2 source_catalog ids backing this sentence>"]
        }
      ]
    }
  ],
  "disclaimer": "<one sentence, max 25 words>",
  "suggested_follow_ups": ["<question 1>", "<question 2>"]
}

Rules:
- Base answers ONLY on the provided dashboard context — never invent numbers not in the JSON.
- If data is missing, say so and note what is unavailable.
- Each bullet is exactly ONE sentence (25–45 words), plain language for government officers.
- Every line MUST include refs naming the SPECIFIC source the facts in THAT line came from: 1–2 IDs copied exactly from context.source_catalog (e.g. climate_trace_afolu, ndc_target_t1, dashboard_progress_afolu, uganda_ndc_2022).
- Match refs to the claim in that line — measured/observed emissions use climate_trace_* or dashboard_timeseries_*; progress % use dashboard_progress_*; ONLY cite ndc_target_* / uganda_ndc_2022 when the line states a pledge target, baseline, or commitment value.
- Do NOT default every line to the NDC pledge. A line about measured data or progress must cite the data source, not the pledge.
- confidence is "high" only when the answer uses live Climate TRACE + clear NDC fields; "low" if mostly unknown/missing.
- Return JSON only — no markdown fences.`;

const SOURCE_ALIASES = {
  "climate trace": "climate_trace_api",
  "climate trace api": "climate_trace_api",
  "ndc pledge": "uganda_ndc_2022",
  "ndc target": "uganda_ndc_2022",
  "dashboard progress": "dashboard_emissions",
  "dashboard": "dashboard_view",
};

function resolveSourceId(ref, catalogMap) {
  if (!ref || typeof ref !== "string") return null;
  const trimmed = ref.trim();
  if (catalogMap.has(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (SOURCE_ALIASES[lower] && catalogMap.has(SOURCE_ALIASES[lower])) {
    return SOURCE_ALIASES[lower];
  }
  for (const [id] of catalogMap) {
    if (lower.includes(id.replace(/_/g, " ")) || id.includes(lower.replace(/\s+/g, "_"))) {
      return id;
    }
  }
  for (const [id, source] of catalogMap) {
    if (lower.includes(source.label.toLowerCase().slice(0, 24))) return id;
  }
  return null;
}

function resolveCitations(refs, catalogMap, used) {
  return (refs ?? [])
    .map((ref) => {
      const id = resolveSourceId(ref, catalogMap);
      if (!id) return null;
      const source = catalogMap.get(id);
      const link = { id, label: source.label, url: source.url };
      used.set(id, link);
      return link;
    })
    .filter(Boolean);
}

function normalizeLine(line, sectionRefs) {
  if (typeof line === "string") {
    return { text: line, refs: sectionRefs ?? [] };
  }
  return {
    text: line?.text ?? "",
    refs: line?.refs?.length ? line.refs : sectionRefs ?? [],
  };
}

function enrichCitations(parsed, catalog = []) {
  const catalogMap = new Map(catalog.map((s) => [s.id, s]));
  const used = new Map();

  const sections = (parsed.sections ?? []).map((section) => {
    const sectionRefs = section.page_refs ?? [];
    const lines = (section.lines ?? []).map((line) => {
      const { text, refs } = normalizeLine(line, sectionRefs);
      const citations = resolveCitations(refs, catalogMap, used);
      return { text, refs, citations };
    });
    const sectionCitations = resolveCitations(
      [...new Set(lines.flatMap((l) => l.refs))],
      catalogMap,
      used,
    );
    return { ...section, lines, page_refs: sectionRefs, citations: sectionCitations };
  });

  const sources = Array.from(used.values());
  return { ...parsed, sections, sources };
}

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
    ? `dash:chat:${question.slice(0, 80)}:${context.selected_target?.id ?? "none"}:${context.geography}`
    : `dash:${action ?? "progress_check"}:${context.selected_target?.id ?? "none"}:${context.geography}`;

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

    const enriched = enrichCitations(parsed, context.source_catalog ?? []);
    const result = {
      type: question ? "chat" : action ?? "progress_check",
      title: enriched.title ?? "Dashboard analysis",
      sections: enriched.sections ?? [],
      sources: enriched.sources ?? [],
      confidence: enriched.confidence ?? "medium",
      disclaimer:
        enriched.disclaimer ??
        "AI-generated summary of dashboard data. Verify against official NDC and MRV sources before official use.",
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
