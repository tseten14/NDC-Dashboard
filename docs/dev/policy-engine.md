# Policy Impact evidence contract

The `/policy-impact` interface and API contract are retained, but production forecasts are **disabled**. Earlier demonstration cases named public reports without enough document-specific quantitative evidence to defend the numerical effects. Returning those numbers would make unsourced examples look like verified country evidence.

## Current behavior

| Method | Path | Current result |
| --- | --- | --- |
| `GET` | `/api/v1/policy-cases` | No demonstration case series exposed as production evidence |
| `GET` | `/api/v1/policy-cases/:id` | Only a reviewed case may be returned |
| `POST` | `/api/v1/policy-impact/forecast` | Explicit unavailable response while no approved quantitative cases exist |
| `GET` | `/api/v1/policy-impact/tef-elements?sector=` | Qualitative intervention labels only |

The screen explains the missing evidence instead of substituting a score, analogy, or model estimate.

## Evidence required before enabling forecasts

Each case must contain:

1. A stable public source URL and document title.
2. Page, table, or section references for every extracted effect.
3. Geography, reporting period, unit, population, and intervention definition.
4. The method used by the source to measure or estimate the effect.
5. A distinction between observed outcomes, modelled outcomes, and author assumptions.
6. A reviewer decision and review date.
7. A rule for whether and how the case can be compared with Uganda.

Passing schema validation is not evidence approval. `npm run build:policy-cases` may prepare candidate files, but production remains unavailable until the review fields and source checks pass.

## Retained architecture

```text
reviewed case JSON
        |
backend/services/policyCaseData.js
        |
backend/services/policyImpactEngine.js
        |
backend/routes/policyImpact.js
        |
frontend /policy-impact
```

`shared/schemas/policyImpact.schema.js` defines the transport shape. `frontend/src/lib/policy-impact-link.ts` preserves navigation context from qualitative mitigation options. Neither file makes a case verified.

## Re-enablement checklist

- At least one approved case passes source and unit checks.
- Forecast responses cite the exact evidence used for each number.
- Incomparable cases are excluded rather than down-weighted into a plausible-looking score.
- Browser tests confirm the unavailable state disappears only when approved evidence exists.
- The user guide, route directory, data guide, and application data audit are updated in the same change.
