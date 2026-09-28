# Application data audit

Audit date: 2026-09-28

This document records the production data boundary for the NDC Data Explorer. A value is shown as observed only when the application can identify its source and validate the response shape. Missing evidence is shown as unavailable. Forecasts, scenarios, and user imports are labelled separately from observed data.

## Verified production sources

- **Emissions:** Climate TRACE public API v7, requested with Uganda's ISO code, `co2e_100yr`, the selected year, and the selected Climate TRACE sector or GADM identifier. The application validates the returned country, year, gas, geography, and numeric values before aggregation. National and Kampala totals and sector values were reconciled directly with live API responses.
- **NDC targets:** Uganda Updated NDC (2022), using the values stated in the official UNFCCC document. A standalone agriculture target is not inferred because the document does not provide a compatible value for the dashboard's agriculture series.
- **Climate finance:** a deliberately partial register containing only two directly sourced commitments: GCF FP034 and World Bank EASP P166685. The interface describes these as commitments and does not present the sum as Uganda's complete climate finance total or as disbursement.
- **Policy documents:** document and passage records retain their source title and URL. Search results are evidence references; they do not prove that a policy caused an emissions outcome.

## Production safeguards added

- Climate TRACE response rows with mismatched country, year, gas, geography, or non-finite values are rejected.
- Source-list pagination is completed before totals are calculated; a first-page subset is never presented as a complete mapped total.
- API failures, missing years, and missing targets remain missing. They are not converted to zero, interpolated, or replaced with bundled demonstration values.
- Legacy example observations, targets, marketplace deals, finance programmes, risk scores, policy-impact cases, indicator histories, and delivery records are removed or filtered from production reads.
- Mock API routes are unavailable in production, even if a mock environment flag is set.
- Risk, unsupported finance analysis, policy impact, and legacy strategy screens stay accessible but state that verified data is unavailable.
- Inferred indicator ownership, cross-sector evidence ratings, causal chains, and keyword-based project eligibility are unavailable until a reviewed evidence set is connected.
- Scenario sample data is development-only. Production hides sample entry points, filters old sample records, and rejects imported sample backups.
- Forecasts use live historical series and remain labelled as planning estimates. District forecasts are not compared with a national target, and incompatible or absent sector targets are not scored.
- User-created or imported records remain user evidence until a reviewer validates them; automated format checks are not described as official verification.

## Checks performed

- Unit and integration tests cover source validation, no-fallback behavior, target progress, district data, marketplace provenance, legacy-record filtering, prediction boundaries, and production mock-route blocking.
- Live Climate TRACE checks compare national and Kampala API totals and sector values with the application's transformations.
- Prediction checks verify live histories, missing-value handling, target compatibility, and forecast metadata.
- TypeScript, lint, production build, route-wide browser tests, accessibility checks, application workflows, and build secret scanning are release gates.

## Limits of this audit

This audit verifies that the application faithfully retrieves, validates, transforms, labels, and cites its inputs. It cannot certify the scientific truth of an upstream provider's estimates. Climate TRACE may revise historical estimates in later releases. Forecasts and scenarios describe assumptions rather than future facts. Uploaded records require human review, and the full text of every policy passage has not been independently fact-checked by this code audit.
