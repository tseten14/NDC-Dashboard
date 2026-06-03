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
| Laws, UN submissions, MCF projects | `data/uganda-policy-documents.json` (from CSV via `npm run build:documents`) | `/documents`, Dashboard “Official sources”, Climate Finance MCF panel | Metadata + CPR/PDF links only; not full-text search until enhanced file (mid-2026). Curated ids in `data/uganda-policy-curated.json`. |

## Bundled catalogue (not live MRV)

| Data | File | Shown in UI | Honesty |
| ---- | ---- | ----------- | ------- |
| NDC targets | `config/ndcTargets.js`, `frontend/src/data/uganda-ndc-data.ts` | Dashboard | From Uganda Updated NDC Sept 2022 |
| Activities | `config/ndcCockpitCatalog.js` | Activities dialog | NDC-traceable; no fabricated focal points |
| Mitigation options | `config/ndcCockpitCatalog.js` | Mitigation tab | Abatement/cost **indicative**; hidden on Mitigation tab, used in Climate Finance |
| Indicator panel targets | API + `measurableVariables` | Non-emissions charts | National indicators, not CT sectors |

**June 2026 audit:** Removed unsourced focal points, foreign case studies, and assumed district lists except where NDC names locations. See `docs/Climate-TRACE-Data-Gaps-and-Requests.txt` § E7.

## Climate Finance — indicative only

`frontend/src/lib/climate-finance.ts` and `climate-finance-pathways.ts` use catalogue `costEstimate` / `emissionsReductionPotential` for screening. UI must never imply audited project costs or investment advice.

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
3. Update `docs/Climate-TRACE-Data-Gaps-and-Requests.txt` if CT cannot supply the metric.
4. Update in-app `/docs` glossary if users will see new abbreviations.
