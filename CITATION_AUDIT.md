# Citation Pipeline Audit — NDC AI (Dashboard Analyze)

> Stage 1 of the "verified externally-sourced citations" task.
> **This document describes the *current* (pre-refactor) behavior. No behavior is changed by this commit.**

## 0. Reality check vs. the task brief

The brief assumes a **FastAPI** backend that already calls **Claude**. Neither is true:

| Brief assumption | Actual code |
| --- | --- |
| FastAPI (Python) | **Node / Express** (`backend/routes/dashboardAi.js`). There *is* a `backend/fastapi/` dir but the analyze endpoint is the Express route. |
| Claude generates the answer | **OpenAI `gpt-4o-mini`** via `https://api.openai.com/v1/chat/completions`. |
| Web search + Citations already wired | **No retrieval at all.** No web search, no `search_result` blocks, no Anthropic Citations. |
| `ANTHROPIC_API_KEY` configured | Not in `.env`. Only `OPENAI_API_KEY`, `GEMINI_API_KEY`. **But `@anthropic-ai/sdk@^0.104.1` is already a dependency.** |

So the four-stage Claude pipeline is a **new build on the Anthropic SDK**, not an edit of an existing Claude integration. The `web_search` server tool + Citations approach in the brief is implementable because the SDK is present; we'll need to add `ANTHROPIC_API_KEY`.

## 1. End-to-end flow (current)

```
DashboardAnalyzePanel.tsx
  └─ buildDashboardAnalyzeContext()         frontend/src/lib/dashboard-ai-context.ts
        └─ buildDashboardFactLedger()        frontend/src/lib/dashboard-ai-facts.ts   ← URLs minted HERE
  └─ POST /api/v1/dashboard/analyze  { action, question, context }
        backend/routes/dashboardAi.js
          └─ callOpenAI(SYSTEM_PROMPT, userMessage)        ← gpt-4o-mini returns JSON {sections:[{lines:[{text,refs}]}]}
          └─ enrichCitationsFromFacts(parsed, context)     backend/services/dashboardAiCitations.js ← maps refs→URLs
  └─ render: PerplexityCitationPill / SourcesFooter         DashboardAnalyzePanel.tsx
```

### Where the chip URL is *actually* generated

**`frontend/src/lib/dashboard-ai-facts.ts` → `buildDashboardFactLedger()`.** Every fact's `source_url` / `viewer_url` is **synthesized in code from a template or a hardcoded constant**, on the client, *before any model call*:

- Observed emissions → `ctEmissionsApiUrl(year, slug)` = `https://api.climatetrace.org/v7/sources/emissions?...` (a **raw JSON API endpoint**, not a human-verifiable page), `viewer_url` = `https://climatetrace.org/inventory?country=UGA&sector=...`.
- Targets / BAU / baselines → the **same single hardcoded PDF**, `UNFCCC_UGANDA_NDC_PDF` (a 40-page document), for *every* sector figure.
- `fact_ct_api_docs` → a hardcoded docs link with `value: null`.

The number and the URL are **decoupled**: the *number* comes from the dashboard's Climate TRACE v7 integration (`emissions.progressBySector[...]`) or NDC data constants (`ndcTargets`); the *URL* is a string template. **Nothing ever confirms the linked page contains that number.**

## 2. The actual defect (be precise)

The brief says chips "link to our own dashboard / internal routes." That is **not literally** what the code does today — the URLs are external (`climatetrace.org`, `api.climatetrace.org`, `unfccc.int`). The real, deeper defects are:

1. **No retrieval.** URLs are minted from templates/constants in `dashboard-ai-facts.ts`, never fetched. A user cannot verify the figure: API URLs return JSON blobs; the UNFCCC link is a whole PDF; the figure was computed by the dashboard, not read from either.
2. **No verification.** Nothing checks that `source_url` contains `value`. Target/BAU figures all point at the same PDF regardless of sector.
3. **Silent fallbacks (the anti-patterns the brief calls out)** in `enrichCitationsFromFacts` / `dashboardAiCitations.js`:
   - `matchFactsByNumbers()` — if the model gives no `refs`, attach *any* ledger fact whose number is numerically close (±0.06 / 2.5%). A coincidental number match mints a citation.
   - `inferFactsFromKeywords()` — if still none, attach a fact by keyword ("emission", "pledge"…) + selected sector. Pure guessing.
   - These guarantee a chip almost always renders, even when the model cited nothing — exactly "substitute a default/decorative link."
4. **Hardcoded source list.** `fact_ct_api_docs` and `buildCatalogFromFacts()` produce "sources" not returned by any retrieval.
5. **Trust theater.** The UI (`PerplexityCitationPill`, header copy "Per-paragraph citations to Climate TRACE, UNFCCC…") presents these as Perplexity-grade grounded citations. They are deterministic template links.

## 3. Inventory — what gets ripped out / changed

| File | Role today | Action |
| --- | --- | --- |
| `frontend/src/lib/dashboard-ai-facts.ts` | Mints `source_url`/`viewer_url` from templates + hardcoded PDF | **Remove URL minting.** Keep the data values (numbers) as structured input; stop attaching synthesized URLs. Numbers become `search_result` doc content for Climate TRACE figures. |
| `frontend/src/lib/dashboard-ai-context.ts` | Bundles ledger + `source_catalog` into context | Drop `source_catalog`/URL fields; pass raw figures only. |
| `backend/services/dashboardAiCitations.js` | `matchFactsByNumbers`, `inferFactsFromKeywords` guessers | **Delete the guessing fallbacks.** Replace with parser that reads Anthropic citation blocks. |
| `backend/routes/dashboardAi.js` | OpenAI call + `enrichCitationsFromFacts` | Replace with 4-stage Claude pipeline: retrieve → ground → verify → serialize. |
| `frontend/.../DashboardAnalyzePanel.tsx` | `PerplexityCitationPill` links to `viewer_url`/`url`; hover = title | Use real `source_url` only; add snippet-on-hover popover; add non-clickable **"source unavailable"** chip for unverified claims; drop `viewer_url` dashboard-preference logic. |
| `frontend/src/data/policy-ai-mock.ts` | `AiSourceLink` type (`url`, `viewer_url`, `domain`, `claim`) | Extend with `supporting_snippet`, `retrieved_at`, `confidence`, `verified`. |

## 4. Target architecture (stages 2–4, not built yet)

1. **Retrieve** — Anthropic `web_search` server tool (`web_search_20260209` if available on Opus 4.8, else `web_search_20250305`), `max_uses` 5–10, `allowed_domains` config constant (climatetrace.org, climatepolicyradar.org, app.climatepolicyradar.org, unfccc.int, iea.org, data.worldbank.org, ourworldindata.org, ipcc.ch, globalcarbonproject.org). Plus structured Climate TRACE figures passed as `search_result` content blocks with `citations:{enabled:true}` carrying the real CT source URL.
2. **Ground** — generation call has Citations enabled → **no Structured Outputs** (incompatible, 400). Let citation blocks interleave; parse them in backend into per-claim objects `{claim_text, source_title, source_url, supporting_snippet, retrieved_at, confidence}`.
3. **Verify** — second call (cheaper model, citations OFF, structured output OK): per claim, strict yes/no "does this snippet support this exact claim incl. numbers?" No → mark `unverified`, render "source unavailable", **no link**.
4. **Render** — verified claim → chip opens real external `source_url` in new tab, hover popover = title + snippet; unverified → muted non-clickable chip. Defensive guard: drop any citation whose URL host is our own domain.

## 5. Open judgment calls (raised with user before stage 2)

- **Strict vs flagged** for unsourced claims → recommend **strict** (render "source unavailable", never guess). The brief agrees.
- **CPR / UNFCCC sector figures** are document-based (PDFs / passage pages), not clean APIs. Web search returns the page; we may need the model to cite the specific passage. Spot-check first real responses to confirm the 91.8 Mt AFOLU target etc. actually resolve to a CPR/UNFCCC page that contains the figure — if not, that claim is correctly marked unverified rather than linked to the generic PDF.
