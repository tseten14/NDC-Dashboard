# Climate TRACE integration

This is the implementation contract for live emissions. Read it with [architecture.md](./architecture.md) and [district-translator.md](./district-translator.md). The upstream [Climate TRACE API reference](https://api.climatetrace.org/v7/docs/index.html) defines the wire format; the [data page](https://climatetrace.org/data) identifies published data releases and cautions that its public API is beta.

## Version, scope, and units

- `config/climateTrace.js` pins **API v7** and `gas=co2e_100yr`. API version is independent of the monthly data release. The API response does not attest to a dataset release. The last manually checked published release is recorded in `config/climateTrace.js`; update it only after checking Climate TRACE's data page. As checked on 28 September 2026, that page lists release **5.11.0** (24 September, monthly data through July 2026).
- National dashboard history begins in 2015. `latestInventoryYear()` deliberately caps complete annual dashboard history at **2025**. The translator offers 2021–2026 and labels 2026 partial. Do not compare a partial year with a complete year as if coverage were equal.
- Upstream `emissionsQuantity` is tonnes CO₂e. `shared/emissionsUnits.js` converts to MtCO₂e by dividing by 1,000,000. Keep negative land-sector removals and distinguish `null` (unavailable) from zero. Keep full precision in source calculations; round display values at the boundary.

## Request paths and ownership

| Product | Upstream request | Local implementation | Meaning |
| --- | --- | --- | --- |
| Dashboard annual sector values | `GET /v7/sources/emissions?year=2025&gas=co2e_100yr&gadmId=UGA&sectors=transportation` | `config/climateTrace.js` → `backend/services/climateTraceTimeseries.js` → `emissionsData.js` | Aggregate product, including spatially uncertain emissions allocated by Climate TRACE |
| District dashboard | Same endpoint with a mapped Climate TRACE GADM id | `config/ugandaDistrictGadm.js`; `backend/routes/emissions.js` | Context only; national NDC target is not scored for a district |
| Reconciliation | Slug aggregates plus `GET /v7/rankings/countries` | `emissionsData.js` | Compares ten slugs with country ranking; reports missing slugs and delta |
| Top sources and map | `GET /v7/sources` with `year`, `gas`, `gadmId`, `limit`, `offset` | `backend/services/climatetrace.js` | Located assets and administrative aggregations; not a territorial total |
| District Translator | Paginated `GET /v7/sources` with `gadmId=UGA` | `backend/services/translator/climateTrace.js` → `polygonInsights.js` | Centroid filtering against full 2020 UBOS district boundaries |
| Sector Classification | `GET /v7/sources/emissions` with a curated `subsectors` slug | `backend/services/classificationSeries.js` | National aggregate for the mapped Climate TRACE subsector; only partial IPCC-category coverage |
| Translator national context | Paginated `/v7/sources` plus unfiltered `/v7/sources/emissions` | `backend/services/translator/reconciliation.js` | Distinct mapped-district rollup and full national aggregate; no equivalence claim |

The browser calls our same-origin `/api/v1/emissions/*` endpoints through `frontend/src/lib/api.ts`; it does not call Climate TRACE directly. `backend/routes/emissions.js` validates geography, sector, year and request shape. `config/climateTrace.js` constructs upstream URLs, sets a 15-second deadline and validates responses with `shared/schemas/climateTrace.schema.js`. An upstream failure must show as unavailable, never as a fabricated zero. `USE_MOCK_DATA=true` is a separate fixture mode; check `/api/health` before using figures in a briefing.

## Sector mapping and reconciliation

The API-backed Sector Classification view exposes six curated, partial IPCC 2006 mappings: `1.A.1` electricity generation, `1.A.3` road transportation, `2.A.1` cement, `3.A.1` cattle pasture enteric fermentation, `3.C.7` rice cultivation, and `4.D.1` domestic wastewater. `config/classificationMappings.js` is their allowlist. Leaf mappings must query the upstream `subsectors` parameter; passing a leaf slug to `sectors` can return the unfiltered national total. `GET /api/v1/emissions/classification/catalog` lists coverage, and `GET /api/v1/emissions/classification/series?code=3.A.1&since=2021&to=2025` returns annual Uganda values, availability, partial-year flags and provenance. The interface never labels these estimates as complete IPCC totals. Existing browser-stored exercises remain in a read-only archive at `/sector-classification/archive`; Scenario Analysis continues to use existing exercise snapshots and does not consume the new API series.

`config/ndcTargets.js` is the mapping source of truth. The nine displayed slugs map to six UI buckets: AFOLU (`forestry-and-land-use`), Agriculture (`agriculture`), Energy (`power`, `buildings`, `fossil-fuel-operations`), Transport (`transportation`), IPPU (`manufacturing`, `fluorinated-gases`), and Waste (`waste`). `mineral-extraction` is the tenth slug and appears only in reconciliation, not a dashboard sector card. Agriculture is a component of the NDC's wider AFOLU framing, not an additional standalone 2022 pledge.

The dashboard sums a sector only when every mapped slug for that year is present. `buildReconciliation()` compares the ten-slug sum with the Climate TRACE country ranking and returns `country_total_mt`, `sector_sum_mt`, `ui_sector_sum_mt`, `delta_mt`, and `missing_slugs`. A missing slug or ranking makes the relevant comparison unavailable. The values can differ because upstream products, refresh timing, or rounding differ; inspect the reported delta rather than assuming exact equality. District all-sector totals use an unfiltered `/sources/emissions` call to avoid rounding a sum of displayed sectors.

## Spatial interpretation and limits

The dashboard's **56 mapped GADM districts** and the translator's **135 pinned 2020 UBOS district boundaries** are different products and identifiers. Do not join them by name or claim they are the same district inventory. The translator sends a boundary `shapeID`; the server resolves full geometry. Its point-filter result includes whole source values when centroids fall inside a district, including administrative aggregations that may cover a larger area. Missing-coordinate rows are excluded. A zero-source result does not prove zero emissions. Translator results must not be reconciled to the dashboard's aggregate district total.

`/emissions/map` is a visualization feed capped at **3,000 upstream rows**, with `truncated` in the response. It excludes unlocated sources. `/emissions/spatial-confidence` explains the located versus aggregate distinction. The translator paginates up to 50,000 rows, rejects incomplete selected-year pagination, deduplicates source/subsector keys, and marks failed historical years unavailable. See [district-translator.md](./district-translator.md) for the precise polygon contract; its Draw UI is currently hidden, while the server-side polygon code remains.

## Caching, verification, and release maintenance

- `backend/services/climatetrace.js` caches the country snapshot for 24 hours and source/map results for one hour. `climateTraceTimeseries.js` caches slug/year/location results for one hour and failures for five minutes. Translator source pages cache for one hour. React Query has its own client freshness rules. A cache hit is live-derived data, not a fresh upstream request.
- Run `npm run verify:climatetrace` for national slug/ranking reconciliation and `node scripts/verify_translator.mjs` for independent source filtering. Run focused unit tests for `climateTraceTimeseries`, `emissionsData`, `polygonInsights`, and translator adapter before changing mapping or units. Live verification depends on upstream availability and should report the request year and retrieval time.
- For a new data release, inspect [Climate TRACE's data page](https://climatetrace.org/data), check whether a complete annual year is available, verify the v7 response shape and Uganda values, then update `TRACE_RELEASE` and any deliberate year caps. The release label describes the published data page; never present it as a release identifier returned by the API.
