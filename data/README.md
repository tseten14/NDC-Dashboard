# `data/` directory

This directory contains reviewed snapshots, raw build inputs, development seeds, and analyst exports. **Live emissions are not stored here**; the production emissions services request them from Climate TRACE API v7.

## Inventory and status

| Path | Purpose | Production status |
| --- | --- | --- |
| `exports/climate-trace-uganda-sources-2021-2025.csv` | Source-level extract prepared for Qlik evaluation | Analyst export; mapped records are not a complete national inventory |
| `exports/uganda-ndc-targets-2022.csv` | Versioned Uganda NDC target extract for Qlik | Official target values transcribed from the 2022 NDC |
| `policy/documents.json` | Climate Policy Radar document metadata snapshot | Shown in Policy Documents; not a live CPR API |
| `policy/curated.json` | Reviewed document identifiers for prominent links | Shown where the UI needs a small source list |
| `policy/passage-documents.json` | Document metadata for passage search | Build-time snapshot |
| `policy/passages.json` | Searchable policy passages | Build-time snapshot; large generated file |
| `policy/topics-index.json` | Topic-to-passage lookup | Generated with the passage corpus |
| `policy/mcf-projects.json` | Multilateral climate-fund project metadata and summaries | Searchable source material, not a finance transaction ledger |
| `policy-cases/*.json` | Earlier Policy Impact candidate cases | Retained for review; excluded from production forecasts until quantitative evidence is approved |
| `seeds/persistenceSeedSource.js` | Development bootstrap records | Development and optional database bootstrap only |
| `seeds/riskSeed.js` | Earlier risk prototype values | Retained for reference; production risk routes return unavailable |
| `sources/*.csv` | Raw Climate Policy Radar exports used by build scripts | Build input; preserve filenames and retrieval context |

## Rebuild generated policy files

```sh
npm run build:documents
npm run build:passages
npm run build:mcf
npm run build:policy-cases
```

- `build:documents` reads the policy CSV snapshot and writes document metadata.
- `build:passages` writes passage documents, passages, and the topic index.
- `build:mcf` writes the climate-fund project search corpus.
- `build:policy-cases` validates candidate case files; validation alone does not approve them for production.

Do not hand-edit generated JSON. Update the reviewed input or build logic, regenerate, then inspect the diff and run the data integrity tests.

## Runtime files

The API may create git-ignored ingest audit files during local work. Persistent production imports and marketplace records require PostgreSQL. Browser-local activities and exercises do not live in this directory.

See [the data source guide](../docs/guide/data.md) for trust labels and [the application data audit](../docs/dev/application-data-audit.md) for current production availability.
