# Data sources and honesty labels

This document helps developers and reviewers know **what is real**, **what is indicative**, and **what is local-only**.

## Live from Climate TRACE (API v7)

| UI area | API | Notes |
| ------- | --- | ----- |
| Dashboard observed/progress | `/api/v1/emissions/dashboard`, `timeseries`, `progress` | National (2015+) or district (2021+) |
| Top emitting sources | `/api/v1/emissions/sources` | Located rows only; do not sum to sector total |
| Spatial certainty | `/api/v1/emissions/spatial-confidence` | Located vs spatially uncertain split |
| Emissions map | `/api/v1/emissions/map` | Geolocated centroids; may truncate at 25k rows |
| AI 2030 | `/api/v1/emissions/predictions` | Trend model on CT history |
| Trackability panel | `/api/v1/emissions/trackability` | From `config/measurableVariables.js` |

Figures are converted to MtCO₂e for display only. Sector reconciliation rules are in `PROJECT_DOCUMENTATION.txt` § B2a.

## Policy document corpus (Climate Policy Radar export)

| Data | File | Shown in UI | Honesty |
| ---- | ---- | ----------- | ------- |
| Laws, UN submissions, MCF projects | `data/policy/documents.json` (from CSV via `npm run build:documents`) | `/documents`, Dashboard “Official sources”, Climate Finance MCF panel | Metadata + CPR/PDF links only. Curated ids in `data/policy/curated.json`. |
| Passage-level key docs (NDC, NDPIV, NBSAP, Agroforestry, Climate Regulations) | `data/policy/passage-documents.json`, `policy/passages.json`, `policy/topics-index.json` (from `npm run build:passages`) | `/documents` → Key documents (CPR) tab; passage panel in document analyse view | CPR passage export snapshot — not a live API. Topic matches from keyword or BERT classifiers; BERT matches may be the full paragraph. |

Build passage corpus: `npm run build:passages` (source CSV in `data/sources/Uganda_key_docs_2026-06-11-1549.csv`). API endpoints: `/api/v1/documents/passage-corpus/meta`, `/documents/:cprDocumentId/passages`, `/documents/topics`, `/documents/passages/search`. For the full Uganda export (~70k rows), the same JSON schema applies; search may move to SQLite/Postgres without changing the API shape.

## Bundled catalogue (not live MRV)

| Data | File | Shown in UI | Honesty |
| ---- | ---- | ----------- | ------- |
| NDC targets | `config/ndcTargets.js`, `frontend/src/data/uganda-ndc-data.ts` | Dashboard | From Uganda Updated NDC Sept 2022 |
| Activities | `config/ndcCockpitCatalog.js` | Activities dialog | NDC-traceable; no fabricated focal points |
| Mitigation options | `config/ndcCockpitCatalog.js` | Mitigation tab | Abatement/cost **indicative**; hidden on Mitigation tab, used in Climate Finance |
| Indicator panel targets | API + `measurableVariables` | Non-emissions charts | National indicators, not CT sectors |

**June 2026 audit:** Removed unsourced focal points, foreign case studies, and assumed district lists except where NDC names locations. See `docs/dev/ct-data-gaps.txt` § E7.

## Climate Finance — indicative only

`frontend/src/lib/climate-finance.ts` and `climate-finance-pathways.ts` use catalogue `costEstimate` / `emissionsReductionPotential` for screening. UI must never imply audited project costs or investment advice. The page can show **live sector gap** from the same emissions predictions API as `NdcGapSummary`.

## Policy Impact — KCI analogies (indicative)

| Data | File | Shown in UI | Honesty |
| ---- | ---- | ----------- | ------- |
| KCI case corpus | `data/policy-cases/*.json` | `/policy-impact` wizard + results | Rule-based matching to UNFCCC KCI reports — not country-specific attribution |
| TEF elements | `services/policyImpactEngine.js` | Intervention picker | Transition Element Framework labels |
| Mitigation deep links | `frontend/src/lib/policy-impact-link.ts` | Dashboard Mitigation Options | Pre-fills wizard from catalogue option |

Build/validate corpus: `npm run build:policy-cases` (`scripts/build_policy_cases.mjs`).

## NDC gap priorities panel

`frontend/src/components/NdcGapSummary.tsx` on Home and Dashboard uses live Climate TRACE predictions where available and labels indicator-only targets as **Indicative**. Chips distinguish live emissions sectors from physical indicators.

## Mapped ingest (Postgres)

| Mode | Persists? | Dashboard effect |
| ---- | --------- | ---------------- |
| Quick scan | No | Profiling report only |
| Mapped import (confirm) | Yes, when `DATABASE_URL` set | Indicator targets (forest, electricity, CSA, wetlands, capacity) show ingested observations + provenance badge |

Does **not** replace Climate TRACE MtCO₂e on emissions sectors. Requires `INGEST_API_KEY` / `VITE_INGEST_API_KEY` for writes.

## Browser-only

| Data | Storage | Notes |
| ---- | ------- | ----- |
| User-created activities | `localStorage` | Per browser |
| Role selection | `localStorage` | Demo |

## Mock mode

`USE_MOCK_DATA=true` — API serves fixtures; banner on startup. Use for offline UI work only.

## When adding new numbers

1. State the **source** (Climate TRACE, NDC PDF, assumption).
2. Label **indicative** if not from audited MRV.
3. Update `docs/dev/ct-data-gaps.txt` if CT cannot supply the metric.
4. Update `PROJECT_DOCUMENTATION.txt` § A2/A7 and in-app `user-guide-content.ts` glossary if users will see new terms.
