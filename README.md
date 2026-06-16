# Uganda NDC Data Explorer

Web application for exploring Uganda’s Nationally Determined Contribution (NDC) data: decision-support cockpit, emissions map, climate finance screening, strategy library, climate risk views, and role-based delivery tools.

**Documentation:** [PROJECT_DOCUMENTATION.txt](PROJECT_DOCUMENTATION.txt) (full non-technical + technical reference). Also [docs/README.md](docs/README.md) (architecture, data honesty, deploy). In-app guide at `/docs`.

## What you can do (in plain terms)

- **See Uganda’s emissions by sector** (AFOLU, Energy, Transport, IPPU, Agriculture, Waste), pulled live from Climate TRACE and compared to Uganda’s Updated NDC targets (September 2022).
- **Switch between National and District views.** On the NDC dashboard, use the **Geography** toggle: *National* shows the whole country (from 2015); *District* lets you pick one of **56 districts** (from 2021) — e.g. Kampala, Wakiso, Gulu. District numbers are observed emissions shown *for context*; NDC targets are national, so districts are not given a pass/fail score.
- **Export** the current view to Excel, PDF, or a CRT/BTR-style CSV — each file is labelled with the geography you’re viewing.
- **Accuracy:** every figure is the live Climate TRACE value (only converted to MtCO₂e). Sector totals reconcile exactly to Uganda’s national total, and each district total matches Climate TRACE’s district total exactly.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind / shadcn
- **Emissions map:** MapLibre GL JS (3D satellite/terrain, token-free Esri World Imagery + AWS terrain tiles)
- **API:** Express (`server.js`) — Climate TRACE live (API v7) + bundled catalog/risk data
- **Mapped ingest:** Postgres when `DATABASE_URL` is set (indicator targets); otherwise ingest confirm is disabled
- **Activities / roles:** Browser `localStorage` (demo)

## Quick start

```sh
git clone <YOUR_GIT_URL>
cd ndc-data-explorer-e051f914
cp .env.example .env
npm install
npm run dev:all
```

- **App:** http://localhost:8080  
- **API:** http://localhost:8787 (proxied as `/api` from Vite in dev)

Pick a country, choose a demo role from the top bar, and explore. **Home** (`/`) is the landing page; the main NDC workspace is **Dashboard** (`/dashboard`).

## Navigation (primary)

| Route | Screen |
| ----- | ------ |
| `/` | Home (NDC gap priorities panel for decision-makers) |
| `/dashboard` | NDC cockpit (sectors, targets, observed, progress, compact gap panel) |
| `/policy-impact` | Socio-economic impact forecasting (KCI case analogies) |
| `/ingest` | Data ingestion (mapped import → Postgres; quick scan profiling) |
| `/climate-finance` | Indicative finance / fund screening |
| `/ai-2030` | 2030 sector predictions (positioned immediately after Climate Finance in the nav) |
| `/documents` | Policy corpus (laws, UN submissions, MCF projects) |
| `/map` | Emissions map — Climate TRACE sources as bubbles over a 3D satellite/terrain basemap (MapLibre GL) |
| `/docs` | User guide (non-technical) |

Advanced sidebar: Strategy Library, My Work, Climate Risk, and legacy cockpit pages.

## NDC targets — Uganda Updated NDC (September 2022)

The dashboard covers all mitigation and key adaptation targets from Uganda's Updated NDC. Targets are aligned to the **BAU-relative** framing used in the NDC: Uganda's emissions grow with the economy, so sector targets are expressed as "% below 2030 BAU", not as absolute reductions from 2015.

| ID | Sector | NDC 2022 target | CT-tracked? |
|----|--------|-----------------|-------------|
| t0 | Economy-wide | −24.7% below BAU → 112.1 MtCO₂e by 2030 (5.9% unconditional / 18.8% conditional) | — |
| t1 | AFOLU | −24.9% below BAU → 91.8 MtCO₂e (BAU: 122.2) | Yes |
| t2 | AFOLU | Forest cover 12.5% (2020) → 21% by 2030 | Indicator panel |
| t9 | AFOLU | Wetlands coverage 8.9% → 12% by 2030 | Indicator panel |
| t4 | Energy (stationary) | −18.8% below BAU → 10.10 MtCO₂e (BAU: 12.44) | Yes |
| t3 | Energy | Electricity capacity 1,276 MW → 4,200 MW by 2030 | Indicator panel |
| t10 | Energy | Electricity access 24% → 75% by 2030 | Indicator panel |
| t5 | Transport *(new in NDC 2022)* | −29% below BAU → 6.8 MtCO₂e (BAU: 9.6) | Yes |
| t6 | Waste *(new in NDC 2022)* | −34.8% below BAU → 2.09 MtCO₂e (BAU: 3.19) | Yes |
| t7 | IPPU *(new in NDC 2022)* | −14% below BAU → 0.86 MtCO₂e (BAU: 1.0) | Yes |
| t8 | Agriculture | CSA adoption 31.7% → 70.7% by 2030 (part of AFOLU NDC) | Indicator panel |

**Note on progress %:** For growing-emission sectors the progress bar measures "how close to the NDC ceiling" rather than absolute reduction from 2015 — this is a consequence of Uganda's BAU-relative NDC framing and is explained in the sector scope notes.

## Data flow

| Feature | Source |
| ------- | ------ |
| Observed emissions / progress (national **and** district) | Express → [Climate TRACE](https://api.climatetrace.org/v7/docs/index.html) (API v7) |
| District list (56 Uganda districts) | Express → `config/ugandaDistrictGadm.js` (from Climate TRACE GADM) |
| Top emitting sources (asset/source-level) | Express → Climate TRACE `GET /v7/sources` |
| Activities & mitigation catalog | Express → `config/ndcCockpitCatalog.js` |
| Climate risk map | Express → `data/riskSeed.js` |
| My Work / activities | `localStorage` in this browser |
| Mapped ingest observations | Postgres `observations` table when `DATABASE_URL` set |
| Policy Impact forecasts | Express → `data/policy-cases/*.json` (KCI analogies, rule-based matching) |
| Policy documents (CPR export) | `data/uganda-policy-documents.json` via `GET /api/v1/documents/*` |

### Emissions API geography

National is the default. To request a district, add one of:

- `?gadm_id=UGA.16_1` — Climate TRACE GADM id, or
- `?district=Kampala` — display name (resolved on the server).

Endpoints: `GET /api/v1/emissions/dashboard`, `/timeseries`, `/progress` (all accept the geography params above), `GET /api/v1/emissions/districts` (the district list), `GET /api/v1/emissions/sources` (asset/source-level emitters; accepts the geography params plus `year`, `limit`, `offset`), `GET /api/v1/emissions/map` (map points; `year`, geography), `GET /api/v1/emissions/predictions`, `GET /api/v1/emissions/spatial-confidence`, `GET /api/v1/emissions/trackability`. To refresh the district→GADM map from Climate TRACE: `node scripts/discover_uganda_gadm.mjs`. To verify the source-level shape: `node scripts/verify_sources.mjs`.

Catalog: `GET /api/v1/catalog/activities`, `GET /api/v1/catalog/mitigation-options` (indicative abatement/cost fields — see [docs/guide/data.md](docs/guide/data.md)).

> Note: "v7" is the Climate TRACE **API** version (which endpoints exist), not the data version. The data is released monthly (latest v5.8.0) and the API always serves the latest. User-facing labels read "Climate TRACE" (no version).

Set `USE_MOCK_DATA=true` in `.env` for offline fixture mode (no Climate TRACE calls). The API logs a startup banner and exposes `mock_mode` on `/api/health` and `/api/v1/health`.

## API security & configuration

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres for mapped ingest + `GET /targets/:id/observations` (see [deploy.md](docs/dev/deploy.md)) |
| `SEED_DB` | Run bundled seed on bootstrap (`true` for first deploy) |
| `FRONTEND_ORIGIN` | Only browser origin allowed by CORS (default `http://localhost:8080`) |
| `INGEST_API_KEY` | Shared secret for **write** endpoints (`POST` under `/api/v1/ingest/*`) |
| `VITE_INGEST_API_KEY` | Same value in the frontend `.env` so the ingest UI can send `x-api-key` |
| `LOG_LEVEL` | Pino log level (`info` default) |

**Write auth:** Include header `x-api-key: <INGEST_API_KEY>` on all ingest `POST` requests (upload, confirm, scan, import). `GET` routes stay public.

**Rate limits (per IP):**

| Scope | Limit |
| ----- | ----- |
| `GET /api/v1/*` | 200 requests / 15 minutes |
| `POST /api/v1/ingest/*` | 20 requests / 15 minutes |
| `POST /api/v1/client-errors` | 50 requests / hour |

Exceeded limits return `429` with `{ "error": "rate_limited", "retry_after_seconds": N }`.

**Ops endpoints (no auth):** `GET /api/v1/health`, `GET /api/v1/health/full`, `POST /api/v1/client-errors`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev:all` | Frontend + API |
| `npm run dev` | Frontend only |
| `npm run start:api` | API only |
| `npm run build` | Production build → `frontend/dist` |
| `npm run test` | Vitest |
| `npm run lint` | ESLint |
| `npm run build:documents` | Regenerate policy JSON from CPR CSV export |

## Deploy

See [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md). In short: build the frontend (`npm run build`), host `frontend/dist/`, and run `server.js` with same-origin `/api` or set `VITE_API_BASE_URL` to your API host.
