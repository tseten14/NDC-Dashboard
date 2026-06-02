# Uganda NDC Data Explorer

Web application for exploring Uganda’s Nationally Determined Contribution (NDC) data: decision-support cockpit, strategy library, climate risk views, and role-based delivery tools.

## What you can do (in plain terms)

- **See Uganda’s emissions by sector** (AFOLU, Energy, IPPU, Agriculture, Waste), pulled live from Climate TRACE and compared to NDC targets.
- **Switch between National and District views.** On the NDC dashboard, use the **Geography** toggle: *National* shows the whole country (from 2015); *District* lets you pick one of **56 districts** (from 2021) — e.g. Kampala, Wakiso, Gulu. District numbers are observed emissions shown *for context*; NDC targets are national, so districts are not given a pass/fail score.
- **Export** the current view to Excel, PDF, or a CRT/BTR-style CSV — each file is labelled with the geography you’re viewing.
- **Accuracy:** every figure is the live Climate TRACE value (only converted to MtCO₂e). Sector totals reconcile exactly to Uganda’s national total, and each district total matches Climate TRACE’s district total exactly.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind / shadcn
- **API:** Express (`server.js`) — Climate TRACE live (API v7) + bundled catalog/risk data
- **Activities:** Browser `localStorage` (no remote database)

## Quick start

```sh
git clone <YOUR_GIT_URL>
cd ndc-data-explorer-e051f914
cp .env.example .env
npm install
npm run dev:all
```

- **App:** http://localhost:8080  
- **API:** http://localhost:8787  

Pick a country, choose a demo role from the top bar, and explore.

## Data flow

| Feature | Source |
| ------- | ------ |
| Observed emissions / progress (national **and** district) | Express → [Climate TRACE](https://api.climatetrace.org/v7/docs/index.html) (API v7) |
| District list (56 Uganda districts) | Express → `config/ugandaDistrictGadm.js` (from Climate TRACE GADM) |
| Top emitting sources (asset/source-level) | Express → Climate TRACE `GET /v7/sources` |
| Activities & mitigation catalog | Express → `config/ndcCockpitCatalog.js` |
| Climate risk map | Express → `data/riskSeed.js` |
| My Work / activities | `localStorage` in this browser |

### Emissions API geography

National is the default. To request a district, add one of:

- `?gadm_id=UGA.16_1` — Climate TRACE GADM id, or
- `?district=Kampala` — display name (resolved on the server).

Endpoints: `GET /api/v1/emissions/dashboard`, `/timeseries`, `/progress` (all accept the geography params above), `GET /api/v1/emissions/districts` (the district list), and `GET /api/v1/emissions/sources` (asset/source-level emitters; accepts the geography params plus `year`, `limit`, `offset`). To refresh the district→GADM map from Climate TRACE: `node scripts/discover_uganda_gadm.mjs`. To verify the source-level shape: `node scripts/verify_sources.mjs`.

> Note: "v7" is the Climate TRACE **API** version (which endpoints exist), not the data version. The data is released monthly (latest v5.8.0) and the API always serves the latest. User-facing labels read "Climate TRACE" (no version).

Set `USE_MOCK_DATA=true` in `.env` for offline fixture mode (no Climate TRACE calls). The API logs a startup banner and exposes `mock_mode` on `/api/health` and `/api/v1/health`.

## API security & configuration

| Variable | Purpose |
| -------- | ------- |
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

## Deploy

Build the frontend (`npm run build`), host `frontend/dist/`, and run `server.js` with `VITE_API_BASE_URL` pointing at your API host.
