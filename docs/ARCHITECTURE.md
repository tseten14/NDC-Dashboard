# Architecture

## Runtime layout

```
Browser (Vite, port 8080)
  ├── /api/*  → proxied to Express (port 8787) in dev
  └── React SPA (frontend/src)

Express (server.js, port 8787)
  ├── routes/emissions.js      Climate TRACE aggregation, map, predictions
  ├── routes/ndcCockpit.js     Catalog (activities, mitigation)
  ├── routes/ingest.js         File upload / scan (writes need API key)
  └── routes/risk.js           Illustrative risk seed data
```

Production may serve `frontend/dist` and the API on one host (Vercel) so the browser calls same-origin `/api/v1/...` without `VITE_API_BASE_URL`.

## Frontend routes (main)

| Path | Page | Notes |
| ---- | ---- | ----- |
| `/select-country` | Country gate | Uganda only fully supported |
| `/` | Home | Landing; legacy `?target=` redirects to `/dashboard` |
| `/dashboard` | NDC cockpit | Main three-column workspace |
| `/ingest` | Data ingestion | Quick scan live; mapped import WIP |
| `/ai-2030` | 2030 forecast | Sector predictions vs targets |
| `/climate-finance` | Finance screening | Indicative MAC / fund matching |
| `/map` | Emissions map | Geolocated sources choropleth + bubbles |
| `/docs` | User guide | Non-technical documentation |
| `/library`, `/my-work`, `/risk/*` | Advanced | Strategy, workbench, risk module |
| `/executive`, `/delivery`, … | Legacy advanced | Older cockpit slices |

## Key frontend directories

| Path | Role |
| ---- | ---- |
| `frontend/src/pages/` | Route-level screens |
| `frontend/src/components/columns/` | Dashboard columns (targets, observed, progress, activities, mitigation) |
| `frontend/src/context/EmissionsDataContext.tsx` | Fetches and caches Climate TRACE via API |
| `frontend/src/data/uganda-ndc-data.ts` | Bundled NDC targets, activities seed, mitigation seed |
| `frontend/src/lib/emissions-integration.ts` | Maps NDC targets → Climate TRACE sectors / indicator panel |
| `frontend/src/lib/climate-finance*.ts` | Indicative finance economics + fund pathways |
| `config/ndcTargets.js` | Server-side NDC target config (source of truth for API logic) |
| `config/ndcCockpitCatalog.js` | Activities + mitigation catalog bodies |
| `config/ugandaDistrictGadm.js` | District name ↔ GADM id |
| `services/climatetrace.js` | Climate TRACE HTTP client + caching |

## Application state

- **`useAppState`** (`frontend/src/hooks/use-app-state.ts`): sector, selected target, geography, time mode — shared across dashboard.
- **`EmissionsDataProvider`**: React Query loads dashboard, timeseries, progress, catalog, indicators per geography.
- **`CountryContext`**: selected country code (session).
- **`CurrentRoleProvider`**: demo roles (permissions only; no real auth).

Target selection must call `setSelectedSector(..., { preserveTarget: true })` when updating sector from URL or target click so the centre/right columns do not reset.

## Emissions API (additions)

Beyond dashboard endpoints, see `routes/emissions.js`:

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/v1/emissions/map` | Points for map (`year`, `gadm_id` / `district`) |
| `GET /api/v1/emissions/predictions` | 2030 sector forecast bundle |
| `GET /api/v1/emissions/spatial-confidence` | Located vs distributed emissions share |
| `GET /api/v1/emissions/trackability` | Measurable variables vs Climate TRACE |

## Dev proxy

`frontend/vite.config.ts` proxies `/api` → `http://localhost:${API_PORT}`. The client uses same-origin `/api/v1` in dev when `VITE_API_BASE_URL` is unset (`frontend/src/lib/api.ts`).
