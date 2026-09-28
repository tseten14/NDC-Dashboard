# Dashboard accuracy review — 28 September 2026

## Live evidence

Production health at `https://ndc-data-explorer-e051f914.vercel.app/api/v1/health` reported `mock_mode: false`.
The deployed 2025 national headline was 40.18 MtCO2e. Climate TRACE v7 returned
40,182,501.987617545 tonnes of `co2e_100yr` for `gadmId=UGA`, consistent after conversion.
The existing economy-wide chart instead summed the six NDC display buckets, excluding
mineral extraction (43,467 tonnes in 2025). These buckets are not the country total.

After the fixes, independently retrieved raw `/v7/sources/emissions` responses matched
all 112 annual values checked: the country total plus six dashboard sectors for
Uganda 2015–2025 and Kampala (`UGA.16_1`) 2021–2025. Display conversion uses the shared
adaptive MtCO2e rounding; aggregation sums raw tonnes before rounding once.

Selected checks:

- Uganda 2025: 40.18 MtCO2e total; forestry/land use −23.96, energy 5.68,
  transport 9.86, industry 5.76, agriculture 33.77, waste 9.03.
- Kampala 2025: 1.74 MtCO2e (1,738,053.109279133 raw tonnes).
- Historical Uganda 2023: independently verified, including the requested-year headline.

## Bugs corrected

- **High — example data on failures:** dashboard observation, progress, completeness,
  and source-trail paths could use bundled synthetic observations. Failures now
  remain unavailable. Production/Vercel cannot activate the demo emissions router.
- **High — incomplete economy-wide total:** use the all-sector API total for each year,
  including mining, rather than summing NDC display buckets. District totals never
  fall back to a subset of sectors or values from different years.
- **High — district scope:** the economy-wide district series was labeled national
  and scored against a national target. It now has district provenance and no national score.
- **High — incompatible progress comparison:** forestry-only data no longer scores the
  entire AFOLU pledge; agriculture has no standalone official emissions pledge to score.
  Policy reference values remain separate from observations.
- **Medium — historical headline:** snapshot caches are keyed by requested year;
  headline year, chart year, rankings and reconciliation use the same requested period.
- **Medium — missing-data handling:** a missing sector estimate stays null, a different
  gas is rejected, failed snapshots expire after 60 seconds, observed lines do not bridge gaps,
  and absent/stale/mismatched inputs cannot receive successful validation flags.
- **Medium — change calculations:** year-on-year percentages require consecutive years
  and a positive prior value; older available years and net sinks are not used as a
  misleading percentage baseline.
- **Medium — displayed precision:** the header preserves useful precision instead of
  rounding 1.74 to 2 Mt; small-value provenance panels scale their value with their unit.
- **Low — provenance date:** date-only year-end labels no longer shift back one day in
  time zones west of UTC. Unmeasured implementation/MRV gap counts are null, not constants.

## Production request behavior

Each year uses one unfiltered aggregate response for both sector rows and the total.
An eleven-year dashboard needs eleven aggregate calls rather than 110 per-sector calls.
There are at most four aggregate calls in flight per server process, with same-year/
same-geography request deduplication and one-hour successful caching. Missing snapshots
have a 60-second cache. The API timeout remains 15 seconds per upstream request.

The public API is beta. Climate TRACE does not guarantee availability or attest the
published dataset release identifier in API replies. v7 is the API version, not the
published data release. These checks prove consistency with API estimates, not that
those estimates are an official national inventory or verified physical measurements.
District admin areas and the Translator's 2020 boundaries are different spatial products;
their totals should not be forced to match.

## Repeatable checks

```sh
npm run verify:climatetrace
VERIFY_YEAR=2023 npm run verify:climatetrace
VERIFY_GADM=UGA.16_1 npm run verify:climatetrace
VERIFY_APP_URL=https://ndc-data-explorer-e051f914.vercel.app npm run verify:climatetrace
npm test
npm run build
npm run test:ux -- dashboard-accuracy.spec.ts
```

The verification command fails on missing upstream values, sector mismatches, wrong
geography/year, mock mode, missing economy-wide totals, or invalid progress comparisons.
The service tests exercise real aggregation and caches with controlled upstream errors;
browser tests use the live backend plus a simulated 503 to verify failure presentation.
