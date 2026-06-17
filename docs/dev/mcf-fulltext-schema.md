# MCF full-text corpus schema

The multilateral climate fund (MCF) corpus powers **Policy documents → Climate fund projects** and links from the Climate Finance dashboard.

## Build

```bash
npm run build:mcf
# optional partner drop-in:
npm run build:mcf -- data/sources/mcf-partner-export.json
```

Reads `data/policy/documents.json` (category `MCF`) and writes `data/policy/mcf-projects.json`.

## Project record

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Catalog document id |
| `title` | string | Project title |
| `funder` | string | Fund / institution |
| `documentUrl` | string | Climate Policy Radar page |
| `contentUrl` | string | PDF or source file URL |
| `amountUsd` | number \| null | Parsed USD millions from summary when present |
| `searchableText` | string | Stripped HTML summary + metadata |
| `fullText` | string \| null | Partner full text when supplied |

## API

- `GET /api/documents/mcf/meta` — counts and funder breakdown
- `GET /api/documents/mcf/search?q=&funder=&sector=&minAmount=&limit=&offset=` — text, funder, sector keyword, or amount filters
- `GET /api/documents/mcf/:projectId` — single project

## Partner data

When Anne's export arrives, place JSON at `data/sources/` with either a top-level `projects` array or `documents` array. Each entry should use the same field names; `fullText` replaces summary-only search text.
