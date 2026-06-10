/**
 * POST /api/v1/policy/analyze
 *
 * Real Claude-backed PDF analysis for CPR policy documents.
 * Fetches the PDF from contentUrl, extracts text with page markers,
 * then calls Claude to produce structured analysis or answer a question.
 *
 * Requires: ANTHROPIC_API_KEY environment variable.
 */
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import NodeCache from "node-cache";

const router = express.Router();

/** Cached extracted PDF text keyed by contentUrl (6h TTL). */
const pdfTextCache = new NodeCache({ stdTTL: 6 * 3600 });
/** Cached analysis results keyed by `${contentUrl}:${action}` (1h TTL). */
const analysisCache = new NodeCache({ stdTTL: 3600 });

const MAX_PDF_CHARS = 90_000;
const FETCH_TIMEOUT_MS = 20_000;

// ── PDF fetch + extract ────────────────────────────────────────────────────────

async function fetchPdfBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "NDC-Explorer/1.0" } });
    if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
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
      const pageText = content.items.map((it) => ("str" in it ? it.str : "")).join(" ").trim();
      if (pageText) parts.push(`[Page ${p}]\n${pageText}`);
      page.cleanup();
    }
    await doc.destroy();
    return { text: parts.join("\n\n"), pages: doc.numPages };
  } catch {
    // fallback: pdf-parse (no page markers)
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

async function getPdfText(contentUrl) {
  const cached = pdfTextCache.get(contentUrl);
  if (cached) return cached;
  const buffer = await fetchPdfBuffer(contentUrl);
  const { text, pages } = await extractTextWithPages(buffer);
  const truncated = text.length > MAX_PDF_CHARS ? text.slice(0, MAX_PDF_CHARS) + "\n\n[… document truncated for analysis …]" : text;
  const result = { text: truncated, pages };
  pdfTextCache.set(contentUrl, result);
  return result;
}

// ── Claude prompts ─────────────────────────────────────────────────────────────

const ACTION_PROMPTS = {
  exec_summary: `Produce an executive summary of this policy document in 4–6 bullet points. Focus on: the problem it addresses, what it commits to, who is responsible, and the timeframe.`,
  key_items:    `List the key commitments, deliverables, and obligations in this document. Group them by theme (e.g. implementation, finance, monitoring). Use concise bullet points.`,
  targets:      `Extract every specific, quantified target, goal, or milestone mentioned in this document. Include the target value, the year, and any conditionality (conditional/unconditional). Do not paraphrase — use the document's own numbers.`,
  recommendations: `List the concrete next steps, recommendations, and actionable items from this document. Focus on what decision-makers and implementing bodies should do, and by when.`,
};

const SYSTEM_PROMPT = `You are an expert climate policy analyst specialising in Uganda's NDC and CPR policy documents.
Analyse the policy document text provided and respond ONLY with a valid JSON object matching this exact TypeScript interface:

{
  "title": string,          // short analysis title (max 8 words)
  "confidence": "high"|"medium"|"low",
  "sections": [
    {
      "heading": string,    // section heading (optional, omit for single-section responses)
      "lines": string[],    // 3–8 concise bullet-point strings; cite page as [p.N] when referencing a specific page
      "page_refs": string[] // list of page refs cited in this section, e.g. ["p.4","p.11"]
    }
  ],
  "disclaimer": string,     // one sentence, max 20 words
  "suggested_follow_ups": string[] // 2–3 follow-up questions the user might want to ask
}

Rules:
- Use [p.N] citations in lines only when you are referencing a specific numbered page from the document text.
- Do not invent page numbers — only cite pages that appear in the [Page N] markers in the text.
- Keep each line under 25 words.
- Respond with JSON only — no markdown fences, no preamble.`;

function buildUserMessage(docTitle, action, question, pdfText) {
  const taskLine = question
    ? `User question: "${question}"`
    : ACTION_PROMPTS[action] ?? ACTION_PROMPTS.exec_summary;
  return `Document title: ${docTitle}\n\nTask: ${taskLine}\n\n--- DOCUMENT TEXT ---\n${pdfText}`;
}

// ── Route ──────────────────────────────────────────────────────────────────────

router.post("/policy/analyze", async (req, res) => {
  const { contentUrl, title, action, question } = req.body ?? {};

  if (!contentUrl || typeof contentUrl !== "string") {
    return res.status(400).json({ error: "contentUrl is required" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: "GEMINI_API_KEY not configured on this server." });
  }

  const cacheKey = question
    ? `${contentUrl}:chat:${question.slice(0, 80)}`
    : `${contentUrl}:${action ?? "exec_summary"}`;

  const cached = analysisCache.get(cacheKey);
  if (cached) return res.json({ ...cached, from_cache: true });

  try {
    const { text: pdfText } = await getPdfText(contentUrl);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1500 },
    });
    const result = await model.generateContent(
      buildUserMessage(title ?? "Policy Document", action, question, pdfText),
    );
    const raw = result.response.text();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Strip any accidental markdown fences
      const stripped = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      parsed = JSON.parse(stripped);
    }

    const result = {
      type: question ? "chat" : (action ?? "exec_summary"),
      title: parsed.title ?? "Analysis",
      sections: parsed.sections ?? [],
      confidence: parsed.confidence ?? "medium",
      disclaimer: parsed.disclaimer ?? "AI-generated analysis of the source document. Verify against the original before official use.",
      suggested_follow_ups: parsed.suggested_follow_ups ?? [],
    };

    analysisCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    req.log?.error({ err }, "policy_ai_analyze_failed");
    return res.status(500).json({ error: err.message || "Analysis failed" });
  }
});

export default router;
