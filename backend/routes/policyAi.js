/**
 * POST /api/v1/policy/analyze
 *
 * OpenAI-backed PDF analysis for CPR policy documents.
 * Fetches the PDF from contentUrl, extracts text with page markers,
 * then calls GPT-5.6 Sol to produce structured analysis.
 *
 * Requires: OPENAI_API_KEY environment variable.
 */
import express from "express";
import NodeCache from "node-cache";
import { z } from "zod";
import { sendClientError, sendServerError } from "../server/errors.js";

const router = express.Router();

/** Cached extracted PDF text keyed by contentUrl (6h TTL). */
const pdfTextCache = new NodeCache({ stdTTL: 6 * 3600 });
/** Cached analysis results keyed by `${contentUrl}:${action}` (1h TTL). */
const analysisCache = new NodeCache({ stdTTL: 3600 });

const MAX_PDF_CHARS = 8_000;  // ~2k tokens — well within free-tier limits
const FETCH_TIMEOUT_MS = 20_000;
/** Largest document this server will pull into memory to read (25 MB). */
const MAX_PDF_BYTES = 25 * 1024 * 1024;

/** Hosts permitted for server-side PDF fetch (SSRF guard). */
const ALLOWED_PDF_HOSTS = new Set([
  "cdn.climatepolicyradar.org",
]);

function assertAllowedPdfUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("contentUrl must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("contentUrl must use HTTPS");
  }
  if (!ALLOWED_PDF_HOSTS.has(parsed.hostname)) {
    throw new Error(`contentUrl host not allowed: ${parsed.hostname}`);
  }
  return parsed.toString();
}

// ── OpenAI REST API ────────────────────────────────────────────────────────────

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
/** Flagship OpenAI model; override with OPENAI_MODEL on the server if needed. */
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";
const OPENAI_TIMEOUT_MS = 55_000;

class QuotaError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "QuotaError";
  }
}

async function callOpenAI(apiKey, systemText, userText) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemText },
          { role: "user",   content: userText },
        ],
        // GPT-5.6+ rejects max_tokens and non-default temperature on Chat Completions.
        max_completion_tokens: 3200,
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

// ── PDF fetch + extract ────────────────────────────────────────────────────────

async function fetchPdfBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NDC-Explorer/1.0" },
      // Never follow a redirect here. The host allow-list is checked against the
      // URL we were given; a redirect would be followed to somewhere that was
      // never checked, which is exactly how an allow-list gets walked around.
      redirect: "error",
    });
    if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);

    // Refuse an oversized document twice over. The declared length is checked
    // first because it is free, then the bytes are counted as they arrive —
    // a Content-Length header is a claim, not a guarantee.
    const declaredLength = Number(res.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_PDF_BYTES) {
      throw new Error("PDF exceeds the maximum size this server will read");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("PDF response had no body");
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_PDF_BYTES) {
        await reader.cancel();
        throw new Error("PDF exceeds the maximum size this server will read");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
  }
}

async function extractTextWithPages(buffer) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const doc = await loadingTask.promise;
    const parts = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .trim();
      if (pageText) parts.push(`[Page ${p}]\n${pageText}`);
      page.cleanup();
    }
    await doc.destroy();
    return { text: parts.join("\n\n"), pages: doc.numPages };
  } catch {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const r = await parser.getText();
      return { text: (r.text || "").replace(/\n{3,}/g, "\n\n").trim(), pages: r.total ?? 0 };
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
}

/** Smart truncation: first 70% + last 20% to preserve intro and conclusions. */
function smartTruncate(text, maxChars) {
  if (text.length <= maxChars) return text;
  const headChars = Math.floor(maxChars * 0.7);
  const tailChars = Math.floor(maxChars * 0.2);
  const head = text.slice(0, headChars);
  const tail = text.slice(-tailChars);
  return `${head}\n\n[… middle section truncated …]\n\n${tail}`;
}

async function getPdfText(contentUrl) {
  const cached = pdfTextCache.get(contentUrl);
  if (cached) return cached;
  const buffer = await fetchPdfBuffer(contentUrl);
  const { text, pages } = await extractTextWithPages(buffer);
  const truncated = smartTruncate(text, MAX_PDF_CHARS);
  const result = { text: truncated, pages };
  pdfTextCache.set(contentUrl, result);
  return result;
}

// ── Prompts ────────────────────────────────────────────────────────────────────

const ACTION_PROMPTS = {
  exec_summary:
    `Produce an executive summary in 4–6 bullets. Each bullet is one dense sentence covering the problem, a key commitment, who is responsible, and the timeframe.`,
  key_items:
    `List key commitments, deliverables, and obligations grouped by theme (implementation, finance, monitoring). One detailed sentence per item: what is committed, who delivers it, the amount or scale, and what it achieves.`,
  targets:
    `Extract every specific, quantified target or milestone. One detailed sentence per target with the value, year, conditionality, and what meeting it would change on the ground.`,
  recommendations:
    `List concrete next steps for decision-makers. One detailed sentence per step: what to do, who should do it, by when, and why it matters.`,
};

const SYSTEM_PROMPT = `You are a plain-language climate policy analyst helping non-technical readers understand Uganda's NDC and CPR policy documents.

Analyse the provided document text and respond ONLY with a valid JSON object:

{
  "title": "<short analysis title, max 8 words>",
  "confidence": "high" | "medium" | "low",
  "sections": [
    {
      "heading": "<section heading>",
      "lines": ["<bullet point>"],
      "page_refs": ["p.4", "p.11"]
    }
  ],
  "disclaimer": "<one sentence, max 20 words>",
  "suggested_follow_ups": ["<question 1>", "<question 2>"]
}

Rules for writing bullet points:
- Each bullet must be exactly ONE sentence — never two sentences, never a line break inside the bullet.
- Make that single sentence rich and self-contained (about 25–45 words): include the what, who, how much or when, and why it matters so a non-specialist can understand without reading further.
- Never write a bare fragment like "Conduct reflection workshops" — always spell out the full detail in one flowing sentence.
- Avoid jargon. Write as if explaining to a government officer who is not a climate specialist.
- Cite the source page as [p.N] at the end of the sentence when referencing a specific page from the document.
- Only cite pages that appear in [Page N] markers in the document text — never invent page numbers.
- Write 4–6 bullets per section.
- Return JSON only — no markdown fences, no preamble.`;

function buildUserMessage(docTitle, action, question, pdfText) {
  const taskLine = question
    ? `User question: "${question}"`
    : ACTION_PROMPTS[action] ?? ACTION_PROMPTS.exec_summary;
  return `Document title: ${docTitle}\n\nTask: ${taskLine}\n\n--- DOCUMENT TEXT ---\n${pdfText}`;
}

// ── Route ──────────────────────────────────────────────────────────────────────

/**
 * What the client is allowed to send.
 *
 * `contentUrl` is checked twice: the schema confirms it is a bounded URL, then
 * assertAllowedPdfUrl confirms it points at the one document host this server
 * will fetch from. The title is capped because it is placed into the prompt, and
 * the question because it is billed by length.
 */
const requestSchema = z.object({
  contentUrl: z.string().url().max(2048),
  title: z.string().trim().max(300).optional(),
  action: z.enum(["exec_summary", "key_items", "targets", "recommendations"]).optional(),
  question: z.string().trim().min(1).max(500).optional(),
});

router.post("/policy/analyze", async (req, res) => {
  const parsedRequest = requestSchema.safeParse(req.body ?? {});
  if (!parsedRequest.success) {
    return sendClientError(res, 400, "invalid_request", "A valid document contentUrl is required.");
  }
  const { contentUrl, title, action, question } = parsedRequest.data;

  let safeContentUrl;
  try {
    safeContentUrl = assertAllowedPdfUrl(contentUrl);
  } catch (err) {
    return sendClientError(res, 400, "content_url_not_allowed", err.message);
  }
  if (!process.env.OPENAI_API_KEY) {
    return sendClientError(res, 503, "ai_unavailable", "AI analysis is not configured on this server.");
  }

  const cacheKey = question
    ? `${safeContentUrl}:chat:${question.slice(0, 80)}`
    : `${safeContentUrl}:${action ?? "exec_summary"}`;

  const cached = analysisCache.get(cacheKey);
  if (cached) return res.json({ ...cached, from_cache: true });

  try {
    const { text: pdfText } = await getPdfText(safeContentUrl);
    const userMessage = buildUserMessage(title ?? "Policy Document", action, question, pdfText);

    const raw = await callOpenAI(process.env.OPENAI_API_KEY, SYSTEM_PROMPT, userMessage);

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const stripped = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(stripped);
    }

    const result = {
      type: question ? "chat" : (action ?? "exec_summary"),
      title: parsed.title ?? "Analysis",
      sections: parsed.sections ?? [],
      confidence: parsed.confidence ?? "medium",
      disclaimer:
        parsed.disclaimer ??
        "AI-generated analysis of the source document. Verify against the original before official use.",
      suggested_follow_ups: parsed.suggested_follow_ups ?? [],
    };

    analysisCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    if (err.name === "QuotaError") {
      req.log?.warn({ event: "policy_ai_quota" }, "AI provider rate limit reached");
      return sendClientError(res, 429, "ai_rate_limited", err.message);
    }
    return sendServerError(req, res, err, "policy_ai_analyze_failed", {
      status: 502,
      code: "ai_analysis_failed",
      message: "The analysis could not be completed. Please try again.",
    });
  }
});

export default router;
