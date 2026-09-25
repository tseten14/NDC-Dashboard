# District Translator: accuracy and extension contract

## Data and releases

The translator reads the current Climate TRACE v7 API. The latest published database release checked on **25 September 2026** is **5.11.0**, published 24 September 2026, with monthly data through July 2026. References: https://climatetrace.org/data and https://api.climatetrace.org/v7/docs/index.html.

The API does not identify its underlying database release in source replies. Reports therefore carry both the verified **published release** and `api_dataset_release: null`. Do not claim that the API has independently attested to release 5.11.0. Requests always query its live endpoint, with an hour-long in-memory cache and shared in-flight requests. The timestamp is when that source dataset was fetched, not when a polygon was drawn. Each trend year retains its own retrieval timestamp. Metadata can be reviewed and updated in `backend/services/translator/climateTrace.js` after each release. The default complete year remains 2025; 2026 is available as partial-year context and is excluded from annual YoY comparisons.

## Current website behavior

The District Translator page starts in district-selection mode. Choose a name or click a boundary; change year and sector filters, inspect coverage, and export CSV or GeoJSON. Custom Draw mode, its point controls, and drawing instructions are temporarily hidden with `DRAW_ENABLED=false` in `frontend/src/pages/DistrictTranslator.tsx`. The map and server polygon code remain in place. Changing the flag back requires UI and spatial regression checks before release.

## Source accuracy

- Query `gadmId=UGA`, `gas=co2e_100yr`, and an explicit year. Validate returned country, gas, year, source identifiers and schema.
- Retrieve 5,000 records per page. Live Uganda verification returned 3,861 distinct source/subsector records in one page. Smaller upstream pages repeat some equal-emission records, so this larger page avoids the observed tie-pagination issue. There is no stable-sort guarantee in the upstream schema. If pagination becomes necessary as coverage grows, duplicate counts are retained; equal-emission records could still be missed by the upstream ranking pagination. Revisit the bulk-download or BigQuery adapter if country coverage exceeds one page.
- Detect conflicting duplicates, repeated pages, upstream failures and a 50,000-row safety limit. Never calculate a silently truncated total. All pages must complete for a selected-year result.
- Divide raw metric tonnes by 1,000,000 without intermediate rounding. Use compensated sums and round only for display. Preserve zero, fractional tonnes, net removals, and missing estimates. Null is not zero. Source counts mean source/subsector records, not necessarily unique physical facilities.
- Split facility, administrative centroid and unknown source kinds. A selected centroid includes the full source value; an administrative centroid is **not** a measured allocation within the drawn polygon. It may represent a much larger area.
- No missing-coordinate sources are allocated to a polygon. A zero-source selection is not evidence of zero territorial emissions. Partial measurements and changing source coverage affect trend comparability.
- A failed selected year fails the analysis. A failed historical year stays unavailable while other years and the selected result remain usable. No interpolation or fabricated fallback data.

## Boundaries and geometry

Full analysis geometries are the 135 **2020 district boundaries**, sourced from Uganda Bureau of Statistics with WHO support, distributed by UN OCHA/HDX and geoBoundaries (`UGA-ADM2-80733802`, CC BY 3.0 IGO). Source: https://www.geoboundaries.org/api/current/gbHumanitarian/UGA/ADM2/ and https://data.humdata.org/dataset/cod-ab-uga. Pinned download revision: `9469f09` in `wmgeolab/geoBoundaries`, `releaseData/gbHumanitarian/UGA/ADM2/`.

These replace the earlier unnamed 151 county geometries, which were incorrectly called districts. 2020 boundaries do not represent all subsequent administrative changes. Their `shapeID` values are boundary identifiers, **not GADM IDs**; no approximate name-based GADM join is asserted. The map uses the matching simplified display file. District selection submits the identifier, and the server resolves the original full geometry. Analysis and exports use that full geometry.

The retained custom-polygon API supports holes and disjoint parts; it validates structure, finite WGS84 coordinates, closure, unique vertices, topology, 512 total positions and 300,000 km² maximum area. It rejects polygons extending outside the union of the intersected district geometries, including edges that cross a national boundary even if vertices are inside. Clipping intersects actual polygons and Turf computes spherical geodesic area. The overlap percentage denominator is the **selected polygon area**. Numerical containment tolerance is `max(1 square metre, selection area × 1e-8)`; tiny geometric slivers can fall within that tolerance. Points on a polygon boundary (including a hole boundary) are included.

## Planet and additional providers

`geometry.js` contains provider-independent spatial selection and district lookup. `climateTrace.js` is the Climate TRACE provider; `polygonInsights.js` builds the report. The versioned response includes an `indicators` collection with provider ID, metric, value, units, spatial method, period and coverage. Metadata exposes only enabled providers.

To add Planet later:

1. Add a server-side provider implementing raster zonal statistics for the validated polygon. Keep credentials on the server. Do not adapt imagery into point-source emissions.
2. Declare `spatial_method: raster_zonal_statistics` and its actual metric and units. Include scene IDs, acquisition times, raster resolution, cloud mask, valid pixel coverage, product/version, license and processing method in the provider result.
3. Reproject and mask the raster correctly, handle nodata and cloud cover, and distinguish a mean indicator from an extensive total. Retain temporal coverage so unrelated years are not compared.
4. Append a separate indicator and provenance object. Never add vegetation, building area or other imagery indicators to MtCO₂e without a documented independently validated conversion model.
5. Handle provider failures independently; keep available results visible and mark unavailable indicators explicitly. Add analytic fixtures for raster nodata, partial coverage and reprojection before enabling the provider.

No Planet API calls, keys, estimates or placeholder observations are included today. Other future methods are `polygon_intersection`, `district_lookup` and `national_context`.

## Verification

`npm test -- polygonInsights translator/climateTrace translator.test` covers malformed geometry, holes, overlap, units, missing values, deduplication, pagination failures, district lookup, filter semantics, stale requests and exports.

With the local API running, `node scripts/verify_translator.mjs` compares a fixed Uganda rectangle against independent raw Climate TRACE source filtering, tests both 2025 and 2026, reconciles source counts and totals, checks all trend years, and verifies HTTP 400 for malformed input. Set `VERIFY_TRANSLATOR_API` to test another API base.

CSV and GeoJSON include the selection geometry, all contained source records, year, units, provider and boundary provenance, filters, coverage limits and missing values. CSV strings are escaped for spreadsheets; numeric removals remain numbers. Analyses are not persisted to the database.
