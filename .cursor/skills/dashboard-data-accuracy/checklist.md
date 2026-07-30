# Dashboard data accuracy — extended checklist

## Pre-flight

- Confirm env: `USE_MOCK_DATA=false` for accuracy work.
- Confirm API up: `GET /api/v1/health` (live CT, not mock-only).
- Country = Uganda (`UGA`) unless the bug is multi-country scaffolding.

## Number trail (national sector)

1. Read UI sector value and year from dashboard.
2. Resolve UI sector → TRACE slugs via `SECTOR_MAP` in `config/ndcTargets.js`.
3. For each slug, fetch CT `/v7/sources/emissions` with `gas=co2e_100yr`, `gadmId=UGA`, `year=…`, single `sectors=` slug.
4. Sum slug Mt (`toMtco2e`); compare to dashboard sector total.
5. Compare country ranking total to sum of `ALL_TRACE_SLUGS` (mapped + unmapped).

## Number trail (district)

1. Note district name → GADM id (`UGA.<n>_1`).
2. Confirm UI does **not** claim NDC on-track for the district.
3. District total must match CT district total; do not force = national sector share.

## Number trail (sources / map)

1. List top sources for geography.
2. Confirm UI copy: sources ≠ full inventory (uncertain spatial mass).
3. Spot-check one named source lat/lon and quantity against `/sources` payload.

## Progress %

1. Confirm formula is distance to **NDC ceiling**, not reduction from 2015.
2. AFOLU example (config): baseline 77.6, target 91.8, bau_2030 122.2, ~24.9% below BAU — do not “fix” by rewriting targets.
3. Run `frontend/src/test/progress-calculation.test.ts` and `all-targets-progress.test.ts`.

## Mock / fallback bugs

- Grep for mock fixtures on live emissions paths.
- Run `frontend/src/test/no-mock-fallback.test.ts` and `resolve-observed-data.test.ts`.
- Vercel: `USE_MOCK_DATA` in `vercel.json` / project env must be `false` for prod accuracy demos.

## Commands quick ref

```bash
npm test -- emissions-accuracy
npm test -- no-mock-fallback resolve-observed-data progress-calculation
npm run verify:climatetrace
VERIFY_YEAR=2022 npm run verify:climatetrace
node scripts/verify_sources.mjs
```

## Severity guide

| Severity | Examples |
|----------|----------|
| Critical | National total wrong; double-counted sector; mock data on production dashboard |
| High | Sector Mt off vs CT; wrong gas; year misaligned; unit tonnes shown as Mt |
| Medium | District label/parent mapping confusion; stale cache after redeploy |
| Low | Copy implying sources sum to total; missing provenance link |
