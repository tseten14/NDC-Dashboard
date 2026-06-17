# `data/` — bundled datasets & seeds

Static data the Express API reads at runtime, plus the raw inputs and build
outputs behind it. **Live emissions never live here** — those come from the
Climate TRACE API. This folder is the *curated / indicative* layer.

```
data/
├── policy/          Climate Policy Radar (CPR) export — the policy corpus
│   ├── documents.json          ~207 docs: laws, plans, UN submissions, MCF projects
│   ├── curated.json            Hand-picked document ids surfaced in the UI
│   ├── passage-documents.json  Per-document passage metadata (counts, slug, CPR links)
│   ├── passages.json           Passage-level text (the bulk of the corpus, ~19 MB)
│   ├── topics-index.json       Topic → passage index for filtering
│   └── mcf-projects.json       MCF searchable corpus (metadata + summary text)
│
├── policy-cases/    UNFCCC KCI case studies for the Policy Impact engine
│   ├── index.json              Corpus index
│   └── kci-*.json              One file per case (hand-authored)
│
├── seeds/           Node-safe seed modules (no Vite path aliases)
│   ├── persistenceSeedSource.js  Climate sectors / KPIs / progress for db seed
│   └── riskSeed.js               Illustrative climate-risk district layers
│
├── sources/         Raw inputs — CSV exports the build scripts read from
│   ├── Uganda_key_docs_2026-06-11-1549.csv
│   └── uganda-policy-documents-2026-06-09.csv
│
└── (runtime, git-ignored — created by the API, not committed)
    ├── ingest-imports/          Per-job audit JSON written on ingest confirm
    └── ingest-observations.json Local fallback store for mapped-ingest rows
```

## Who reads what

| File / folder | Read by | Notes |
| ------------- | ------- | ----- |
| `policy/documents.json`, `policy/curated.json` | `services/policyDocuments.js` → `/api/v1/documents/*` | Document library + "Official sources" |
| `policy/passage-documents.json`, `policy/passages.json`, `policy/topics-index.json` | `services/policyPassages.js` → `/api/v1/documents/passage-corpus/*` | Key-documents passage panel |
| `policy/mcf-projects.json` | `services/mcfProjects.js` → `/api/v1/documents/mcf/*` | Climate fund projects tab + Climate Finance panel |
| `policy-cases/*.json` | `services/policyCaseData.js` → `/api/v1/policy-cases` | Policy Impact wizard |
| `seeds/persistenceSeedSource.js` | `db/seed.ts`, `services/persistence.js` | Postgres seed + file fallback |
| `seeds/riskSeed.js` | `routes/risk.js` → `/api/v1/risk/*` | Illustrative risk choropleth |

## Rebuilding the generated files

The `policy/` JSON is generated from the CSVs in `sources/` — do not hand-edit:

```sh
npm run build:documents    # sources/*.csv  -> policy/documents.json + curated.json
npm run build:passages     # sources/*.csv  -> policy/passage-documents.json, passages.json, topics-index.json
npm run build:mcf          # policy/documents.json -> policy/mcf-projects.json (+ optional partner JSON)
npm run build:policy-cases  # validate policy-cases/*.json against the Zod schema
```

## Scaling note

`policy/passages.json` is already ~19 MB. The Postgres schema in
`db/schema.ts` (`policy_documents`, `policy_passage_documents`,
`policy_passages`, with GIN full-text indexes) is the path to serving thousands
of documents with SQL instead of loading JSON into memory.

## Honesty labels

What is live vs indicative vs local-only is documented in
[`docs/guide/data.md`](../docs/guide/data.md). Keep it in sync when adding data.
