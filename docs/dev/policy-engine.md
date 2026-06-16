# Policy Impact Engine

Socio-Economic Impact Forecasting for the NDC Data Explorer — maps policy interventions to socio-economic outcomes via the Transition Element Framework (TEF), grounded in UNFCCC KCI case studies.

## Architecture

```
KCI case JSON (data/policy-cases/*.json)
        │
        ▼
services/policyCaseData.js ──► routes/policyImpact.js (/api/v1/*)
        │
        ▼
services/policyImpactEngine.js (rule-based matching + aggregation)
        │
        ▼
frontend /policy-impact (wizard + results dashboard)
```

## Data model

See `shared/schemas/policyImpact.schema.js` for Zod definitions:

- **PolicyCase** — curated KCI extraction with TEF chain, outcomes, trade-offs
- **ForecastRequest** — objective, intervention, parameters (scale, timeline, sector)
- **ForecastResponse** — impacts, trade-offs, pathway diagram, matched cases, confidence

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/policy-cases` | List corpus index |
| GET | `/api/v1/policy-cases/:id` | Full case detail |
| POST | `/api/v1/policy-impact/forecast` | Run impact forecast |
| GET | `/api/v1/policy-impact/tef-elements?sector=` | TEF intervention picker |

## Matching algorithm

Weights: sector 40%, intervention_type 35%, region affinity 15%, scale 10%.

Top 3 cases aggregated; each outcome includes provenance string and case IDs.

## Corpus (phase 1)

| ID | Source |
|----|--------|
| `kci-brazil-ag-credit` | Brazil agricultural credit |
| `kci-africa-energy-jobs` | Africa energy transition jobs |
| `kci-india-carbon-pricing` | India destination-based carbon pricing |
| `kci-maldives-response` | Maldives response measures |

Build/validate: `npm run build:policy-cases` (`node scripts/build_policy_cases.mjs`)

Colleague sign-off checklist: `node scripts/build_policy_cases.mjs --review`

## Design principles

1. **Evidence-first** — every output traceable to KCI case
2. **Trade-off explicit** — positive/negative effects and affected groups
3. **Scenario-based** — scale and timeline sliders
4. **Transparent** — confidence scores and disclaimers
5. **No black-box ML** in MVP — rule-based only

## Integration points

- `/climate-finance` — funding step link from results (sector + project query params)
- `/documents` — intervention pathway (TEF diagram)
- `/dashboard` — mitigation options deep link via `policy-impact-link.ts` (done)
- `NdcGapSummary` — objective/gap context on Home and Dashboard briefing
