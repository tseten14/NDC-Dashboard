---
name: dashboard-data-accuracy
description: >-
  Find bugs where the NDC dashboard shows wrong Climate TRACE or NDC numbers;
  verify API responses match the UI; run accuracy checks and reconciliation.
  Use when the user asks to look for data bugs, check dashboard accuracy,
  validate API vs dashboard, Climate TRACE mismatches, unit conversion errors,
  sector totals, district emissions, or mock-data leaks.
---

# Dashboard data accuracy

Look for bugs in the project. Make sure the API is correctly showing the right data on the dashboard. Do a good data accuracy review.

## Goal

Prove that **numbers on the dashboard** match **live Climate TRACE / API payloads** (after the project’s only allowed transform: tonnes → MtCO₂e), and that NDC targets/progress math is not silently wrong.

## Non-negotiables

- Prefer **live** Climate TRACE (`USE_MOCK_DATA=false`). Mock mode is for offline demos only — never treat mock numbers as production accuracy.
- Emissions come from Climate TRACE; the app must **not invent or interpolate** missing years.
- Gas field: `co2e_100yr`. Geography: `gadm_id=UGA` (national) or `UGA.<n>_1` (district).
- **v7** is the Climate TRACE **API version**, not a data-release label.
- Top Emitting Sources **do not sum** to the sector/country total (spatially uncertain mass is in totals only).
- District view is **observed context**, not district-level NDC pass/fail.
- NDC 2030 ceilings can be **above** 2015 baselines (BAU-relative targets) — progress ≠ “cut from 2015.”

## Workflow

Copy and track:

```
Accuracy review:
- [ ] 1. Reproduce wrong number (sector, year, geography, UI surface)
- [ ] 2. Hit the same API the UI uses; compare raw → MtCO₂e
- [ ] 3. Run automated accuracy suite
- [ ] 4. Check known pitfalls (sector map, multi-sector URL, units, mock)
- [ ] 5. Fix at source (API/config/aggregation), not by hardcoding UI
- [ ] 6. Re-run verify + targeted tests; report before/after
```

### 1. Reproduce

Note: UI sector (`afolu` | `energy` | `transport` | `ippu` | `agriculture` | `waste`), year, national vs district, and which widget (banner, timeseries, progress %, map, sources).

Key UI → API paths:

| UI | Typical API |
|----|-------------|
| Dashboard sector timeseries / progress | `/api/v1/emissions/timeseries`, sector aggregates via `SECTOR_MAP` |
| Country / ranking context | Climate TRACE rankings + country totals |
| Map / Top sources | `/api/v1/emissions/sources`, `/map` |
| Health / live vs mock | `/api/v1/health` |

Config of record: `config/ndcTargets.js` (`SECTOR_MAP`, `ALL_TRACE_SLUGS`), `config/climateTrace.js` (`toMtco2e`, fetch helpers).

### 2. Compare API ↔ dashboard

1. Fetch the **same** endpoint/params the frontend uses (see `frontend/src/lib/api.ts` and `backend/services/emissionsData.js` / `climateTraceTimeseries.js`).
2. Convert with `toMtco2e` only — do not re-round ad hoc in the UI.
3. Flag if dashboard ≠ API Mt after conversion (tolerance: ~0.01–0.1 Mt unless district micro-totals).
4. If API is wrong vs Climate TRACE upstream, fix fetch/aggregation; if only UI is wrong, fix mapping/display.

### 3. Run automated checks

```bash
# Unit + mapping guards (no network)
npm test -- emissions-accuracy resolve-observed-data no-mock-fallback progress-calculation district-data data-validation

# Live Climate TRACE reconciliation (needs network)
npm run verify:climatetrace
# optional: VERIFY_YEAR=2023 VERIFY_DELTA_TOLERANCE=0.1 npm run verify:climatetrace

npm run verify:sources   # if investigating asset/source drill-down
npm run verify:predictions  # AI 2030 path only when in scope
```

Scripts: `scripts/verify_climatetrace_v7.mjs`, `scripts/verify_sources.mjs`.

### 4. Known failure modes (check these)

| Bug class | What to look for |
|-----------|------------------|
| Sector double-count / gap | Slug in two `SECTOR_MAP` buckets or missing from `ALL_TRACE_SLUGS` |
| Multi-sector URL pitfall | Repeated `sectors=` query params — CT returns **first only** |
| Unit bug | Showing tonnes as Mt, or over-rounding small district values to 0 |
| Mock leak | `USE_MOCK_DATA=true` or mock fallback on live routes |
| Sources vs total | Expecting named sources to equal sector total |
| NDC math | Treating BAU-relative target as absolute cut from baseline |
| Stale cache | NodeCache serving old CT responses after upstream change |
| Wrong gas / year | Not `co2e_100yr`, or year outside inventory range |

### 5. Fix rules

- Correct **aggregation/config/API**, not a one-off frontend constant that drifts from TRACE.
- Preserve reconciliation: UI sector sum + unmapped slugs (e.g. mineral extraction) must explain country total.
- Add/adjust a test in `frontend/src/test/emissions-accuracy.test.ts` (or sibling) when fixing a mapping/unit bug.
- Do not “fix” TRACE vs NDC divergence by forcing them equal — show warning / provenance instead.

### 6. Report format

```markdown
## Data accuracy findings
- **Severity**: critical | high | medium | low
- **Surface**: (e.g. Dashboard AFOLU 2023 national)
- **UI value**: …
- **API / TRACE value**: … (endpoint + params)
- **Root cause**: …
- **Fix**: …
- **Verification**: tests / verify:climatetrace result
```

Prioritize critical/high (wrong national totals, double-counts, mock in prod) before copy/UX.

## Code map

- `config/ndcTargets.js` — NDC targets + TRACE slug ↔ UI sector map
- `config/climateTrace.js` — CT URLs, `toMtco2e`, per-slug fetch
- `backend/services/climateTraceTimeseries.js` — UI sector series
- `backend/services/emissionsData.js` — dashboard payload shaping
- `backend/services/climatetrace.js` — sources / map aggregates
- `frontend/src/lib/progress.ts` — progress % / QA flags
- `frontend/src/test/emissions-accuracy.test.ts` — reconciliation invariants
- `docs/PROJECT_DOCUMENTATION.txt` § A5 — accuracy framing for users

## Extra detail

For a longer checklist and endpoint notes, see [checklist.md](checklist.md).
