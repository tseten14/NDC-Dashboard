# Architecture

## Runtime layout

```
Browser (Vite, port 8080)
  ├── /api/*  → proxied to Express (port 8787) in dev
  └── React SPA (frontend/src)

Express (backend/server.js, port 8787; backend/server/createApp.js)
  ├── backend/routes/emissions.js      Climate TRACE aggregation, translator, map, predictions
  ├── backend/routes/documents.js      Policy corpus, CPR passages, MCF projects
  ├── backend/routes/dashboardAi.js    NDC AI (fact ledger)
  ├── backend/routes/policyAi.js       Policy document PDF analysis
  ├── backend/routes/ndcCockpit.js     Catalog (activities, mitigation)
  ├── backend/routes/ingest.js         File upload / scan / confirm (operator-protected writes)
  ├── backend/routes/authSession.js    Operator unlock session
  ├── backend/routes/policyImpact.js   Unavailable until verified quantitative cases exist
  └── backend/routes/risk.js           Unavailable until a verified hazard dataset exists
```

Production copies `frontend/dist` to `public/` and runs `api/index.js` on Vercel. The browser calls same-origin `/api/v1/...` without `VITE_API_BASE_URL`.

Site login is temporarily disabled by `frontend/src/lib/auth-config.ts`: `/auth` redirects to country selection, `AuthGate` passes through, and `CurrentRoleProvider` uses a stable browser-local identity. Supabase auth code remains for future use. Operator sessions for protected writes are separate and remain active.

## Frontend routes (main)

| Path | Page | Notes |
| ---- | ---- | ----- |
| `/select-country` | Country gate | Uganda only fully supported |
| `/` | Home | Landing; legacy `?target=` redirects to `/dashboard` |
| `/map` | Emissions map | MapLibre 3D satellite map — **second item in top nav** |
| `/district-translator` | District Translator | 135 pinned 2020 UBOS boundaries; custom Draw UI hidden |
| `/sector-classification`, `/scenario-analysis` | Explore tools | Reporting sectors and policy scenarios |
| `/dashboard` | NDC cockpit | Three-column workspace + NDC AI dialog |
| `/ingest` | Data ingestion | Mapped import → Postgres; quick scan profiling |
| `/policy-impact` | Policy Impact | Explicit unavailable state until verified cases are connected |
| `/ai-2030` | 2030 forecast | Sector predictions vs targets |
| `/climate-finance` | Climate finance | Partial sourced commitment register |
| `/documents` | Policy documents | Library + CPR passages + MCF + pathway |
| `/documents/view` | Document AI | Split-pane PDF analysis |
| `/docs` | Documentation | User guide + system design (bundled markdown) |
| `/mwp-marketplace` | Marketplace | Database-backed user project records; unavailable without persistence |
| `/library`, `/my-work`, `/risk/*` | Advanced | Strategy, workbench, risk module |
| `/executive`, `/delivery`, … | Legacy advanced | Older cockpit slices |

`frontend/src/lib/navigation.ts` defines the All tools menu (Explore, Plan & deliver, Manage & learn). The top bar shows shortcuts and role-dependent visibility. There is no persistent left sidebar. Older `/brazil-chat` and presenter mode are removed.

## Key frontend directories

| Path | Role |
| ---- | ---- |
| `frontend/src/pages/` | Route-level screens |
| `frontend/src/components/columns/` | Dashboard columns (targets, observed, progress) |
| `frontend/src/components/dashboard/DashboardAnalyzePanel.tsx` | NDC AI UI |
| `frontend/src/components/map/EmissionsMap3D.tsx` | MapLibre emissions map |
| `frontend/src/context/EmissionsDataContext.tsx` | Fetches and caches Climate TRACE via API |
| `frontend/src/pages/DistrictTranslator.tsx` | District picker, filters, results; Draw feature flag |
| `frontend/src/components/map/DistrictTranslatorMap.tsx` | MapLibre district selection and dormant drawing handlers |
| `frontend/src/lib/auth-config.ts` | Site-login switch and local identity |
| `frontend/src/lib/dashboard-ai-facts.ts` | Fact ledger for NDC AI citations |
| `frontend/src/lib/dashboard-ai-context.ts` | AI analyze context builder |
| `frontend/src/lib/data-lineage.ts` | Climate TRACE sector lineage + public URLs |
| `frontend/src/data/user-guide-content.ts` | In-app Documentation tab copy |
| `data/policy/documents.json` | CPR export corpus (`npm run build:documents`) |
| `data/policy/passages.json` | CPR passage corpus (`npm run build:passages`) |
| `data/policy/mcf-projects.json` | MCF projects (`npm run build:mcf`) |
| `config/ndcTargets.js` | Server-side NDC target config |
| `config/climateTrace.js` | Climate TRACE v7 URLs, schema checks, unit conversion |
| `backend/services/climatetrace.js` | Snapshot, located sources, map and spatial confidence |
| `backend/services/climateTraceTimeseries.js` | Slug/year/district cache and strict sector sums |
| `backend/services/emissionsData.js` | Dashboard response and ranking reconciliation |
| `backend/services/translator/` | Paginated sources and pinned district geometry |
| `backend/services/dashboardAiCitations.js` | Deterministic NDC AI citation resolver |

## Application state

- **`useAppState`**: sector, selected target, geography, time mode — shared across dashboard.
- **`EmissionsDataProvider`**: React Query loads dashboard, timeseries, progress, catalog, indicators per geography.
- **`CountryContext`**: selected country code (session).
- **`CurrentRoleProvider`**: local identity and role UI preferences while site login is disabled; role selection does not authorize API writes.
- **`OperatorSessionProvider`**: checks the server-issued operator cookie for protected ingestion and marketplace actions.

Target selection must call `setSelectedSector(..., { preserveTarget: true })` when updating sector from URL or target click so the centre/right columns do not reset.

## API (additions beyond dashboard)

| Endpoint | Purpose |
| -------- | ------- |
| `GET /api/v1/emissions/map` | Points for map (`year`, `gadm_id` / `district`) |
| `GET /api/v1/emissions/translator/metadata`, `/districts`, `/sources` | Translator release/boundary metadata and year-specific source layer |
| `POST /api/v1/emissions/polygon-insights` | Centroid-filtered insights for a selected UBOS `district_id` |
| `GET`, `POST`, `DELETE /api/v1/auth/session` | Inspect, unlock, lock operator session |
| `POST /api/v1/dashboard/analyze` | NDC AI — body includes `fact_ledger`, `quotable_facts` |
| `GET /api/v1/documents/passages/search` | CPR passage search |
| `GET /api/v1/documents/mcf/search` | MCF project search |
| `POST /api/v1/policy-ai/analyze` | Policy document PDF AI |
| `GET /api/v1/emissions/predictions` | 2030 sector forecast bundle |
| `GET /api/v1/emissions/spatial-confidence` | Located vs distributed emissions share |
| `GET /api/v1/emissions/trackability` | Measurable variables vs Climate TRACE |

## Dev proxy

Vite proxies `/api` → `http://localhost:8787` when using `npm run dev` or `npm run dev:servers`.

For exact upstream Climate TRACE queries, version handling, caching, and limitations, see [climate-trace-integration.md](./climate-trace-integration.md).
