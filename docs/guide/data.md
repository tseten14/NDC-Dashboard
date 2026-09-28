# Data sources and honesty labels

This document helps developers and reviewers know **what is real**, **what is indicative**, and **what is local-only**.

## Live from Climate TRACE (API v7)

| UI area | API | Notes |
| ------- | --- | ----- |
| Dashboard observed/progress | `/api/v1/emissions/dashboard`, `timeseries`, `progress` | National (2015+) or district (2021+) |
| Top emitting sources | `/api/v1/emissions/sources` | Located rows only; do not sum to sector total |
| Spatial certainty | `/api/v1/emissions/spatial-confidence` | Located vs spatially uncertain split |
| Emissions map | `/api/v1/emissions/map` | Geolocated centroids; capped at 3,000 upstream rows and reports `truncated` |
| District Translator | `/api/v1/emissions/translator/*` and `/polygon-insights` | Mapped source centroids within pinned 2020 UBOS district boundaries; not an aggregate district inventory |
| AI 2030 | `/api/v1/emissions/predictions` | Trend model on CT history |
| Trackability panel | `/api/v1/emissions/trackability` | From `config/measurableVariables.js` |

Figures are converted from tonnes to MtCO₂e. Dashboard aggregates include spatially uncertain emissions; source maps and Translator omit unlocated rows. Sector reconciliation reports a delta and missing slugs, so exact equality must be checked rather than assumed. See [Climate TRACE integration](../dev/climate-trace-integration.md).

## Policy document corpus (Climate Policy Radar export)

| Data | File | Shown in UI | Honesty |
| ---- | ---- | ----------- | ------- |
| Laws, UN submissions, MCF projects | `data/policy/documents.json` (from CSV via `npm run build:documents`) | `/documents`, Dashboard “Official sources”, Climate Finance MCF panel | Metadata + CPR/PDF links only. Curated ids in `data/policy/curated.json`. |
| MCF searchable corpus | `data/policy/mcf-projects.json` (from `npm run build:mcf`) | `/documents` → Climate fund projects tab; Climate Finance MCF panel search link | Summary text + metadata today; `fullText` field ready for partner export. See `docs/dev/mcf-fulltext-schema.md`. |
| Passage-level key docs (NDC, NDPIV, NBSAP, Agroforestry, Climate Regulations) | `data/policy/passage-documents.json`, `policy/passages.json`, `policy/topics-index.json` (from `npm run build:passages`) | `/documents` → Key documents (CPR) tab; passage panel in document analyse view | CPR passage export snapshot — not a live API. Topic matches from keyword or BERT classifiers; BERT matches may be the full paragraph. Topic labels are deduplicated at build time (no duplicate topic IDs in UI). |

Build passage corpus: `npm run build:passages` (source CSV in `data/sources/Uganda_key_docs_2026-06-11-1549.csv`). API endpoints: `/api/v1/documents/passage-corpus/meta`, `/documents/:cprDocumentId/passages`, `/documents/topics`, `/documents/passages/search`. For the full Uganda export (~70k rows), the same JSON schema applies; search may move to SQLite/Postgres without changing the API shape.

Build MCF corpus: `npm run build:mcf`. API endpoints: `/api/v1/documents/mcf/meta`, `/documents/mcf/search`, `/documents/mcf/:projectId`.

## Bundled catalogue (not live MRV)

| Data | File | Shown in UI | Honesty |
| ---- | ---- | ----------- | ------- |
| NDC targets | `config/ndcTargets.js`, `frontend/src/data/uganda-ndc-data.ts` | Dashboard | From Uganda Updated NDC Sept 2022 |
| Activities | `config/ndcCockpitCatalog.js` | Activities dialog | NDC-traceable; no fabricated focal points |
| Mitigation options | `config/ndcCockpitCatalog.js` | Mitigation tab | Qualitative planning concepts; unsupported abatement and cost values are unavailable |
| Indicator panel targets | API + `measurableVariables` | Non-emissions charts | National indicators, not CT sectors |

**June 2026 audit:** Removed unsourced focal points, foreign case studies, and assumed district lists except where NDC names locations. See `docs/dev/ct-data-gaps.txt` § E7.

## Climate Finance — partial sourced register

The production register contains only the exact provider-sourced commitments for GCF FP034 and World Bank EASP P166685. It is not a national total, payment ledger, disbursement report, or investment recommendation. Unsupported catalogue costs and abatement estimates are not used as finance evidence.

## Policy Impact — unavailable pending verified evidence

The route and API remain in place, but production does not return a socio-economic forecast. Earlier demonstration cases did not contain document-specific quantitative effects that could support the displayed numbers. The server returns an explicit unavailable response until reviewed cases include a source document, page reference, units, geography, period, method, and effect values. See [policy-engine.md](../dev/policy-engine.md).

## NDC gap priorities panel

`frontend/src/components/NdcGapSummary.tsx` on Home and Dashboard uses live Climate TRACE predictions where available and labels indicator-only targets as **Indicative**. Chips distinguish live emissions sectors from physical indicators.

## NDC AI (Dashboard)

`POST /api/v1/dashboard/analyze` with client-built `fact_ledger` (`frontend/src/lib/dashboard-ai-facts.ts`). OpenAI Chat Completions (default `gpt-4o-mini`); citations resolved to Climate TRACE v7 API URLs or UNFCCC NDC PDF. Requires `OPENAI_API_KEY`. Not web search.

## Mapped ingest (Postgres)

| Mode | Persists? | Dashboard effect |
| ---- | --------- | ---------------- |
| Quick scan | No | Profiling report only |
| Mapped import (confirm) | Yes, when `DATABASE_URL` set | Indicator targets (forest, electricity, CSA, wetlands, capacity) show ingested observations + provenance badge |

Does **not** replace Climate TRACE MtCO₂e on emissions sectors. Both browser import paths require an operator session obtained with the server-side `INGEST_API_KEY` passphrase; automated clients can use an `x-api-key` header. Do not put the key in a `VITE_` variable.

## Browser-only

| Data | Storage | Notes |
| ---- | ------- | ----- |
| User-created activities | `localStorage` | Per browser |
| Role selection | `localStorage` | Local UI permissions only |
| Site identity | Browser-local `LOCAL_USER` while site login is disabled | Not a verified person or authorization for server writes |

## Mock mode

`USE_MOCK_DATA=true` — API serves fixtures; banner on startup. Use for offline UI work only.

## When adding new numbers

1. State the **source** (Climate TRACE, NDC PDF, assumption).
2. Label **indicative** if not from audited MRV.
3. Update `docs/dev/ct-data-gaps.txt` if CT cannot supply the metric.
4. Update `PROJECT_DOCUMENTATION.txt` § A2/A7 and in-app `user-guide-content.ts` glossary if users will see new terms.
