# Architecture

## Runtime layout

```
Browser (Vite, port 8080)
  ├── /api/*  → proxied to Express (port 8787) in dev
  └── React SPA (frontend/src)

Express (server.js, port 8787)
  ├── routes/emissions.js      Climate TRACE aggregation, map, predictions
  ├── routes/documents.js      Policy corpus, CPR passages, MCF projects
  ├── routes/dashboardAi.js    NDC AI (OpenAI over fact ledger)
  ├── routes/policyAi.js       Policy document PDF analysis (OpenAI)
  ├── routes/ndcCockpit.js     Catalog (activities, mitigation)
  ├── routes/ingest.js         File upload / scan / confirm (writes need API key + Postgres)
  ├── routes/policyImpact.js   KCI case matching + TEF forecast
  └── routes/risk.js           Illustrative risk seed data
```

Production may serve `frontend/dist` and the API on one host (Vercel) so the browser calls same-origin `/api/v1/...` without `VITE_API_BASE_URL`.

## Frontend routes (main)

| Path | Page | Notes |
| ---- | ---- | ----- |
| `/select-country` | Country gate | Uganda only fully supported |
| `/` | Home | Landing; legacy `?target=` redirects to `/dashboard` |
| `/map` | Emissions map | MapLibre 3D satellite map — **second item in top nav** |
| `/dashboard` | NDC cockpit | Three-column workspace + NDC AI dialog |
| `/ingest` | Data ingestion | Mapped import → Postgres; quick scan profiling |
| `/policy-impact` | Policy Impact wizard | KCI analogies + TEF intervention forecast |
| `/ai-2030` | 2030 forecast | Sector predictions vs targets |
| `/climate-finance` | Finance screening | Indicative MAC / fund matching; MCF links |
| `/documents` | Policy documents | Library + CPR passages + MCF + pathway |
| `/documents/view` | Document AI | Split-pane PDF analysis |
| `/docs` | Documentation | User guide + system design (bundled markdown) |
| `/library`, `/my-work`, `/risk/*` | Advanced | Strategy, workbench, risk module |
| `/executive`, `/delivery`, … | Legacy advanced | Older cockpit slices |

**Removed:** `/brazil-chat` (Brazil mock chatbot) and presenter/demo mode — no longer in the app.

## Key frontend directories

| Path | Role |
| ---- | ---- |
| `frontend/src/pages/` | Route-level screens |
| `frontend/src/components/columns/` | Dashboard columns (targets, observed, progress) |
| `frontend/src/components/dashboard/DashboardAnalyzePanel.tsx` | NDC AI UI |
| `frontend/src/components/map/EmissionsMap3D.tsx` | MapLibre emissions map |
| `frontend/src/context/EmissionsDataContext.tsx` | Fetches and caches Climate TRACE via API |
| `frontend/src/lib/dashboard-ai-facts.ts` | Fact ledger for NDC AI citations |
| `frontend/src/lib/dashboard-ai-context.ts` | AI analyze context builder |
| `frontend/src/lib/data-lineage.ts` | Climate TRACE sector lineage + public URLs |
| `frontend/src/data/user-guide-content.ts` | In-app Documentation tab copy |
| `data/policy/documents.json` | CPR export corpus (`npm run build:documents`) |
| `data/policy/passages.json` | CPR passage corpus (`npm run build:passages`) |
| `data/policy/mcf-projects.json` | MCF projects (`npm run build:mcf`) |
| `config/ndcTargets.js` | Server-side NDC target config |
| `services/climatetrace.js` | Climate TRACE HTTP client + caching |
| `services/dashboardAiCitations.js` | Deterministic NDC AI citation resolver |

## Application state

- **`useAppState`**: sector, selected target, geography, time mode — shared across dashboard.
- **`EmissionsDataProvider`**: React Query loads dashboard, timeseries, progress, catalog, indicators per geography.
- **`CountryContext`**: selected country code (session).
- **`CurrentRoleProvider`**: local roles (permissions only; no real auth).

Target selection must call `setSelectedSector(..., { preserveTarget: true })` when updating sector from URL or target click so the centre/right columns do not reset.

## API (additions beyond dashboard)

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/v1/emissions/map` | Points for map (`year`, `gadm_id` / `district`) |
| `POST /api/v1/dashboard/analyze` | NDC AI — body includes `fact_ledger`, `quotable_facts` |
| `GET /api/v1/documents/passages/search` | CPR passage search |
| `GET /api/v1/documents/mcf/search` | MCF project search |
| `POST /api/v1/policy-ai/analyze` | Policy document PDF AI |
| `GET /api/v1/emissions/predictions` | 2030 sector forecast bundle |
| `GET /api/v1/emissions/spatial-confidence` | Located vs distributed emissions share |
| `GET /api/v1/emissions/trackability` | Measurable variables vs Climate TRACE |

## Dev proxy

Vite proxies `/api` → `http://localhost:8787` when using `npm run dev:all`.
