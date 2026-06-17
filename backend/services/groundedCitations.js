/**
 * Grounded citations for NDC AI — Perplexity-style retrieval + verification.
 *
 * Replaces the old deterministic fact→URL mapping (which minted citation URLs
 * from templates and guessed sources via number/keyword matching). Every chip
 * now resolves to a real external page that the model actually cited, and each
 * citation is verified by a second model pass before it is shown as a link.
 *
 * Four stages (see CITATION_AUDIT.md):
 *   1. Retrieve — Climate TRACE structured figures as `search_result` blocks +
 *      Claude's native `web_search` server tool restricted to trusted domains.
 *   2. Ground   — generation call (Opus) with Citations enabled (NO structured
 *      output — the two are incompatible). Citation blocks are parsed out here.
 *   3. Verify   — a cheaper model (Haiku, structured output, citations off)
 *      checks each snippet actually supports the claim including the numbers.
 *   4. Render   — handled on the frontend; this module returns the clean payload.
 */

// ---------------------------------------------------------------------------
// Config (extend the allow-list here)
// ---------------------------------------------------------------------------

/** Strongest model for answer generation. */
export const GENERATION_MODEL = "claude-opus-4-8";
/** Cheaper/faster model for the strict verification pass. */
export const VERIFICATION_MODEL = "claude-haiku-4-5";

/**
 * Web search server tool version. `web_search_20260209` adds dynamic filtering
 * on Opus 4.8 (discards irrelevant snippets automatically); `web_search_20250305`
 * is the universally-available fallback.
 * TODO: re-review on stronger model — confirm dynamic filtering behaves without a
 * standalone code_execution tool in this SDK version; drop to 20250305 if web
 * search silently returns no results.
 */
export const WEB_SEARCH_TOOL_VERSION = "web_search_20260209";

/**
 * Trusted climate sources the model is allowed to cite via web search.
 * Config constant — extend freely. A bare domain also matches its subdomains
 * (e.g. "worldbank.org" covers data.worldbank.org). Curated from authoritative
 * emissions/measurement, NDC/policy, and Uganda-official sources.
 */
export const ALLOWED_DOMAINS = [
  // Measured / inventory emissions
  "climatetrace.org",
  "edgar.jrc.ec.europa.eu", // EDGAR (EU Joint Research Centre)
  "globalcarbonproject.org",
  "globalcarbonatlas.org",
  "ourworldindata.org",
  "climatewatchdata.org", // WRI Climate Watch / CAIT
  "fao.org", // FAOSTAT — AFOLU / land use
  // Targets, pledges & policy
  "unfccc.int", // NDC Registry, synthesis reports
  "climatepolicyradar.org",
  "app.climatepolicyradar.org",
  "climateactiontracker.org",
  "ndcpartnership.org",
  "unep.org", // UNEP Emissions Gap Report
  // Context / methodology / comparative
  "ipcc.ch",
  "iea.org",
  "worldbank.org",
  "data.worldbank.org",
  "climateknowledgeportal.worldbank.org",
  "wri.org", // World Resources Institute
  "globalforestwatch.org",
  "irena.org", // renewable energy
  "carbonbrief.org",
  // Uganda-official statistics & environment
  "mwe.go.ug", // Ministry of Water and Environment
  "nema.go.ug", // National Environment Management Authority
  "ubos.org", // Uganda Bureau of Statistics
];

// ---------------------------------------------------------------------------
// URL helpers + defensive same-domain guard
// ---------------------------------------------------------------------------

export function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\.|^api\./, "");
  } catch {
    return "";
  }
}

/** Our own deploy/dev hosts — citations pointing here must never be shown. */
function ourDomains() {
  const set = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);
  for (const v of [process.env.FRONTEND_ORIGIN, process.env.VITE_API_BASE_URL]) {
    const h = v && hostOf(v);
    if (h) set.add(h);
  }
  return set;
}

/** True if the URL points at our own domain (dashboard / API) — never citable. */
export function isOurDomain(url) {
  const h = hostOf(url);
  if (!h) return true; // un-parseable → reject
  for (const d of ourDomains()) {
    if (h === d || h.endsWith(`.${d}`)) return true;
  }
  return false;
}

export function domainSlug(url) {
  const host = hostOf(url);
  if (!host) return "source";
  if (host.includes("climatetrace")) return "climatetrace";
  if (host.includes("climatepolicyradar")) return "climatepolicyradar";
  if (host.includes("unfccc")) return "unfccc";
  if (host.includes("ourworldindata")) return "ourworldindata";
  if (host.includes("worldbank")) return "worldbank";
  if (host.includes("iea")) return "iea";
  if (host.includes("ipcc")) return "ipcc";
  const parts = host.split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "source";
}

// ---------------------------------------------------------------------------
// Stage 1 — Retrieve: structured Climate TRACE / NDC figures as search_result
// content blocks, each carrying its real external source URL. These are passed
// to the model as cited source documents (NOT merged silently into prose).
// ---------------------------------------------------------------------------

/**
 * Build `search_result` content blocks from the dashboard fact ledger. Climate
 * TRACE figures point at the public Climate TRACE inventory; NDC targets/baselines
 * point at the UNFCCC NDC Registry. The figure is written into the block text so
 * the model can cite the exact value with a real source attribution.
 */
export function buildSearchResultBlocks(context) {
  const ledger = Array.isArray(context?.fact_ledger) ? context.fact_ledger : [];
  const blocks = [];
  const seen = new Set();

  for (const f of ledger) {
    if (f.value == null) continue;
    // Prefer the human-readable viewer page; fall back to the raw source URL.
    const source = f.viewer_url || f.source_url;
    if (!source || isOurDomain(source)) continue;

    const unit = f.unit ? ` ${f.unit}` : "";
    const year = f.year ? ` in ${f.year}` : "";
    const text = `${f.claim}${year}: ${f.value}${unit}. (${f.source_label})`;

    const key = `${source}|${text}`;
    if (seen.has(key)) continue;
    seen.add(key);

    blocks.push({
      type: "search_result",
      source,
      title: f.source_label || f.claim,
      content: [{ type: "text", text }],
      citations: { enabled: true },
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Stage 2 — Ground: parse Anthropic citation blocks out of the response.
// ---------------------------------------------------------------------------

/** Normalise one Anthropic citation object into our per-claim citation schema. */
function normalizeCitation(c) {
  let url = null;
  let title = null;
  const snippet = c?.cited_text ?? "";

  switch (c?.type) {
    case "web_search_result_location":
      url = c.url;
      title = c.title;
      break;
    case "search_result_location":
      url = c.source;
      title = c.title;
      break;
    // Document-citation shapes (we don't send documents, but guard anyway).
    case "char_location":
    case "page_location":
    case "content_block_location":
      title = c.document_title;
      url = null;
      break;
    default:
      return null;
  }

  if (!url) return null; // no real external URL → not a usable citation
  if (isOurDomain(url)) return null; // defensive: never link to our own domain

  return {
    source_title: title || hostOf(url),
    source_url: url,
    supporting_snippet: snippet,
    retrieved_at: new Date().toISOString(),
    confidence: 0, // filled in by verification
    verified: false,
  };
}

/**
 * Walk the generation response content blocks, collecting text segments and the
 * citations attached to each. Returns ordered segments; non-text blocks
 * (server_tool_use, web_search_tool_result, thinking) are skipped.
 */
export function parseGroundedSegments(message) {
  const segments = [];
  for (const block of message?.content ?? []) {
    if (block.type !== "text") continue;
    const text = block.text ?? "";
    if (!text.trim()) continue;

    const citations = [];
    const seen = new Set();
    for (const c of block.citations ?? []) {
      const cit = normalizeCitation(c);
      if (!cit) continue;
      const key = `${cit.source_url}|${cit.supporting_snippet}`;
      if (seen.has(key)) continue;
      seen.add(key);
      citations.push(cit);
    }
    segments.push({ text, citations });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Stage 3 — Verify: strict snippet-supports-claim check (cheaper model).
// ---------------------------------------------------------------------------

const VERIFY_SYSTEM = `You are a strict citation verifier. For each claim and its candidate supporting snippet, decide whether the snippet DIRECTLY supports the claim — including every number, unit, and year stated in the claim. A snippet that is merely topically related, or that contains a different figure, does NOT support the claim. Be conservative: when in doubt, answer false. Respond only in the required schema.`;

const VERIFY_SCHEMA = {
  type: "json_schema",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer" },
            supported: { type: "boolean" },
            confidence: { type: "number" },
          },
          required: ["index", "supported", "confidence"],
        },
      },
    },
    required: ["results"],
  },
};

/**
 * Verify one segment's citations against its claim text. Mutates each citation's
 * `verified` / `confidence`. Returns the segment. Citations enabled = OFF here,
 * so structured output is allowed.
 */
async function verifySegment(client, segment) {
  if (!segment.citations.length) return segment;

  const candidates = segment.citations.map((c, i) => ({
    index: i,
    snippet: c.supporting_snippet,
    source: c.source_title,
  }));

  const userText =
    `Claim:\n"""${segment.text.trim()}"""\n\n` +
    `Candidate snippets:\n${JSON.stringify(candidates, null, 2)}\n\n` +
    `For each candidate index, does the snippet directly support the claim including all numbers, units, and years?`;

  try {
    const res = await client.messages.create({
      model: VERIFICATION_MODEL,
      max_tokens: 1024,
      system: VERIFY_SYSTEM,
      output_config: { format: VERIFY_SCHEMA },
      messages: [{ role: "user", content: userText }],
    });

    const parsed = extractJson(res);
    const results = Array.isArray(parsed?.results) ? parsed.results : [];
    for (const r of results) {
      const c = segment.citations[r.index];
      if (!c) continue;
      c.verified = r.supported === true;
      c.confidence = clamp01(r.confidence);
    }
  } catch {
    // Verification failed → leave all citations unverified (strict default).
  }
  return segment;
}

/** Run verification across all segments in parallel. */
export async function verifySegments(client, segments) {
  await Promise.all(segments.map((s) => verifySegment(client, s)));
  return segments;
}

// ---------------------------------------------------------------------------
// Stage 4 — Serialize: build the clean payload for the frontend.
// ---------------------------------------------------------------------------

const NUMBER_RE = /\d/;

/**
 * Turn verified segments into the frontend payload. A segment that states a
 * figure but has no verified citation is marked `unverified` (renders as a
 * non-clickable "source unavailable" chip). There is NO fallback link.
 */
export function serializeAnswer(segments) {
  const answer_segments = segments.map((s) => {
    const verified = s.citations.filter((c) => c.verified);
    const statesFigure = NUMBER_RE.test(s.text);
    const unverified = statesFigure && verified.length === 0;
    return {
      text: s.text,
      citations: verified,
      unverified,
    };
  });

  const unverified_claims = answer_segments
    .filter((s) => s.unverified)
    .map((s) => ({
      claim_text: s.text,
      reason: "No retrieved source was found to contain this exact figure.",
    }));

  const numericSegments = answer_segments.filter((s) => NUMBER_RE.test(s.text));
  let confidence = "medium";
  if (numericSegments.length && unverified_claims.length === 0) confidence = "high";
  else if (unverified_claims.length) confidence = "low";

  return { answer_segments, unverified_claims, confidence };
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/** Pull parsed JSON out of a structured-output response (handles SDK variants). */
function extractJson(res) {
  if (res?.parsed_output) return res.parsed_output;
  for (const block of res?.content ?? []) {
    if (block.type === "text" && block.text) {
      try {
        return JSON.parse(block.text);
      } catch {
        const stripped = block.text
          .replace(/^```json?\s*/i, "")
          .replace(/```\s*$/, "")
          .trim();
        try {
          return JSON.parse(stripped);
        } catch {
          /* fall through */
        }
      }
    }
  }
  return null;
}
