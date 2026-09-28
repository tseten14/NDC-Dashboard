# NDC Data Explorer

Web application for exploring Uganda’s Nationally Determined Contribution (NDC) data: decision-support cockpit, emissions map, climate finance screening, strategy library, climate risk views, and role-based delivery tools.

**Documentation:** [Complete application and engineering guide (PDF)](docs/NDC-Data-Explorer-Complete-Guide.pdf). The in-app guide remains at `/docs`. Use the [Qlik Cloud setup guide](docs/qlik-cloud.md) to import live Climate TRACE emissions and the app's Uganda NDC target extract. A separate [Climate TRACE source-record CSV](data/exports/climate-trace-uganda-sources-2021-2025.csv) is available for source-level evaluation.

## What you can do (in plain terms)

- **See Uganda’s emissions by sector** (AFOLU, Energy, Transport, IPPU, Agriculture, Waste), pulled live from Climate TRACE and compared to Uganda’s Updated NDC targets (September 2022).
- **Switch between National and District views.** On the NDC dashboard, use the **Geography** toggle: *National* shows the whole country (from 2015); *District* lets you pick one of **56 districts** (from 2021) — e.g. Kampala, Wakiso, Gulu. District numbers are observed emissions shown *for context*; NDC targets are national, so districts are not given a pass/fail score.
- **Export** the current view to Excel, PDF, or a CRT/BTR-style CSV — each file is labelled with the geography you’re viewing.
- **Read the limits:** dashboard aggregate totals include spatially uncertain emissions, while source maps and District Translator include located records. The API reports reconciliation deltas and missing coverage; consult [Climate TRACE integration](docs/dev/climate-trace-integration.md) before comparing them.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind / shadcn
- **Emissions map:** MapLibre GL JS (3D satellite/terrain, token-free Esri World Imagery + AWS terrain tiles)
- **API:** Express (`backend/server.js`) — Climate TRACE live (API v7) + bundled catalog/risk data
- **Mapped ingest:** Postgres when `DATABASE_URL` is set (indicator targets); otherwise ingest confirm is disabled
- **Site access:** site-wide Supabase login is temporarily disabled; country and role are browser preferences. Protected import and other operator actions still require a server-issued operator session.
- **Activities / roles:** Browser `localStorage` (personal drafts + role preference)

## Project structure

```
frontend/        React + Vite + TypeScript UI (pages, components, hooks)
backend/         Server-side code
  server.js        Express entry for local development
  server/          App factory + middleware
  routes/          HTTP route handlers (/api/v1/*)
  services/        Business logic (Climate TRACE, ingest, policy, predictions)
  lib/             Ingest pipeline + parsers
  ml/              Python ML/data scripts (emissions forecast, ingest analysis) + requirements
  fastapi/         Standalone Python FastAPI service (parallel implementation)
database/        Drizzle schema, bootstrap/seed, and SQL migrations/
api/             Vercel serverless adapter (re-exports the Express app)
config/          Shared config + data modules (NDC targets, Climate TRACE) used by frontend + backend
shared/          Cross-cutting helpers + schemas used by frontend + backend
data/            Bundled static data (policy corpus, seeds, sources)
scripts/         Build/dev tooling (.mjs) and verifications
docs/            Architecture, deploy, and user guides
```

## Quick start

```sh
git clone <YOUR_GIT_URL>
cd ndc-data-explorer-e051f914
cp .env.example .env
npm install
npm run dev
```

`npm run dev` does the whole local setup in one go: creates `.env` if missing, checks
dependencies, validates the bundled data, runs the live accuracy verifications against
Climate TRACE, then starts the web front end and the API together.

Those verifications need internet access and take a minute or so. To skip them (offline,
or when you just want the app up):

```sh
SKIP_DEV_VERIFY=true npm run dev
```

- **App:** http://localhost:8080  
- **API:** http://localhost:8787 (proxied as `/api` from Vite in dev)

No account is required to browse. Pick a country, choose a role from the top bar, and explore. **Home** (`/`) is the landing page; **Emissions Map** (`/map`) and **Dashboard** (`/dashboard`) are primary analysis screens.

## Navigation

The top bar shows shortcuts; **All tools** opens the full menu grouped into Explore, Plan & deliver, and Manage & learn. Visibility depends on the selected role. The routes below remain registered in `frontend/src/App.tsx`.

| Route | Screen |
| ----- | ------ |
| `/` | Home (NDC gap priorities panel for decision-makers) |
| `/map` | Emissions map — 3D satellite/terrain basemap (MapLibre GL) |
| `/district-translator` | Select a 2020 UBOS district for mapped Climate TRACE source insights; custom drawing is temporarily hidden |
| `/sector-classification` | Choose reporting sector codes |
| `/scenario-analysis` | Compare actions and policy evidence |
| `/dashboard` | NDC cockpit (targets, observed, progress, **NDC AI**) |
| `/ingest` | Data ingestion (mapped import → Postgres; quick scan profiling) |
| `/ai-2030` | 2030 sector predictions |
| `/policy-impact` | Socio-economic impact forecasting (KCI case analogies) |
| `/climate-finance` | Indicative finance / fund screening |
| `/documents` | Policy corpus + CPR passages + MCF projects |
| `/mwp-marketplace` | Pre-authored mitigation investment deals |
| `/my-work` | Browser-local activities and submissions |
| `/docs` | User guide + system design |

Additional pages include Strategy Library, Climate Risk, and legacy cockpit routes; use the in-app Documentation links or direct URLs.

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
| District Translator | Express → paginated Climate TRACE `/v7/sources` + pinned 2020 UBOS district boundaries (135); distinct from dashboard GADM districts |
| Activities & mitigation catalog | Express → `config/ndcCockpitCatalog.js` |
| Climate risk map | Express → `data/seeds/riskSeed.js` |
| My Work / activities | `localStorage` in this browser |
| Mapped ingest observations | Postgres `observations` table when `DATABASE_URL` set |
| Policy Impact forecasts | Express → `data/policy-cases/*.json` (KCI analogies, rule-based matching) |
| Policy documents (CPR export) | `data/policy/documents.json` via `GET /api/v1/documents/*` |

### Emissions API geography

National is the default. To request a district, add one of:

- `?gadm_id=UGA.16_1` — Climate TRACE GADM id, or
- `?district=Kampala` — display name (resolved on the server).

Endpoints: `GET /api/v1/emissions/dashboard`, `/timeseries`, `/progress` (all accept the geography params above), `GET /api/v1/emissions/districts` (the district list), `GET /api/v1/emissions/sources` (asset/source-level emitters; accepts the geography params plus `year`, `limit`, `offset`), `GET /api/v1/emissions/map` (map points; `year`, geography), `GET /api/v1/emissions/predictions`, `GET /api/v1/emissions/spatial-confidence`, `GET /api/v1/emissions/trackability`. To refresh the district→GADM map from Climate TRACE: `node scripts/discover_uganda_gadm.mjs`. To verify the source-level shape: `node scripts/verify_sources.mjs`.

Catalog: `GET /api/v1/catalog/activities`, `GET /api/v1/catalog/mitigation-options` (indicative abatement/cost fields — see [docs/guide/data.md](docs/guide/data.md)).

> "v7" is the Climate TRACE **API** version, not the dataset release. The [published data page](https://climatetrace.org/data) listed release 5.11.0 on 25 September 2026; the API does not identify its underlying release in each reply. The dashboard caps complete annual history at 2025 and the translator marks 2026 partial. See [the integration contract](docs/dev/climate-trace-integration.md).

Set `USE_MOCK_DATA=true` in `.env` for offline fixture mode (no Climate TRACE calls). The API logs a startup banner and exposes `mock_mode` on `/api/health` and `/api/v1/health`.

## API security & configuration

| Variable | Purpose |
| -------- | ------- |
| `DATABASE_URL` | Postgres for mapped ingest + `GET /targets/:id/observations` (see [deploy.md](docs/dev/deploy.md)) |
| `SEED_DB` | Run bundled seed on bootstrap (`true` for first deploy) |
| `FRONTEND_ORIGIN` | Only browser origin allowed by CORS (default `http://localhost:8080`) |
| `INGEST_API_KEY` | Shared secret for **write** endpoints (`POST` under `/api/v1/ingest/*`) |
| `VITE_INGEST_API_KEY` | Legacy variable; do not use it. The browser exchanges an operator passphrase for an HttpOnly session cookie. Never bundle `INGEST_API_KEY` into frontend code. |
| `LOG_LEVEL` | Pino log level (`info` default) |
| `TRUST_PROXY_HOPS` | Number of reverse proxies in front of the API (default: 1 on Vercel, 0 locally). Rate limits are per visitor only when this is right — see below |
| `INGEST_STORE_PATH` | Override where file-mode imports are written (used by tests to stay isolated) |

**Write auth:** Browser operators use `/api/v1/auth/session` to obtain a short-lived HttpOnly cookie, then same-origin requests use that session. Non-browser jobs may send `x-api-key: <INGEST_API_KEY>`. Protected writes reject requests when the server key is not configured. Public read endpoints stay open.

**Rate limits (per IP):**

> These are per *visitor* only because the app declares how many proxies sit in front of
> it (`TRUST_PROXY_HOPS`, applied via Express's `trust proxy` setting in
> `backend/server/createApp.js`). Without that, Express reads the proxy's own address for
> every request, so the whole user base shares a single budget and everyone starts getting
> `429`s at trivial traffic. The default is correct for Vercel; set it explicitly if you
> deploy behind a different number of proxies.

| Scope | Limit |
| ----- | ----- |
| `GET /api/v1/*` | 200 requests / 15 minutes |
| `POST /api/v1/ingest/*` | 20 requests / 15 minutes |
| `POST /api/v1/dashboard/analyze` and `POST /api/v1/policy/analyze` | 50 requests / 15 minutes |
| `POST /api/v1/client-errors` | 50 requests / hour |

Exceeded limits return `429` with `{ "error": "rate_limited", "retry_after_seconds": N }`.

**Ops endpoints (no auth):** `GET /api/v1/health`, `GET /api/v1/health/full`, `POST /api/v1/client-errors`.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | **Full local setup**: env + deps + data checks + live verifications, then web + API |
| `npm run dev:servers` | Web + API only, skipping all the checks |
| `npm run dev:frontend` | Front end only |
| `npm run start:api` | API only |
| `npm run build` | Production build → `frontend/dist` |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright) — drives the real app |
| `npm run lint` | ESLint |
| `npm run verify:all` | Live accuracy checks: Climate TRACE + 2030 predictions |
| `npm run build:documents` | Regenerate policy JSON from CPR CSV export |

Environment switches worth knowing:

| Variable | Effect |
| -------- | ------ |
| `SKIP_DEV_VERIFY=true` | Skip the live verifications in `npm run dev` (offline work) |
| `USE_MOCK_DATA=true` | Serve stand-in figures instead of calling Climate TRACE |
| `USE_DB_FALLBACK=true` | With no `DATABASE_URL`, save imports to a local file instead |

## Deploy

See [docs/dev/deploy.md](docs/dev/deploy.md). Vercel serves the built React app and routes same-origin `/api/*` to `api/index.js`, which mounts the shared Express app.
