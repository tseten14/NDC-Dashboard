# Deploy to Vercel

This repo deploys as **one Vercel project**: static React UI + Express API as a serverless function.

## Quick deploy

1. Install [Vercel CLI](https://vercel.com/docs/cli) (optional) or use the Vercel GitHub integration.
2. From the repo root:

```bash
npx vercel
```

3. Follow prompts (link to your Git repo or deploy from local).
4. Production URL will serve:
   - **App:** `https://<your-project>.vercel.app/`
   - **API:** `https://<your-project>.vercel.app/api/v1/...`
   - **Health:** `https://<your-project>.vercel.app/api/health`

No `VITE_API_BASE_URL` is required in production — the frontend calls `/api/v1` on the same host.

## Environment variables (Vercel dashboard)

| Variable | Required | Notes |
|----------|----------|--------|
| `USE_MOCK_DATA` | No | Set in `vercel.json` to `false` for **live Climate TRACE**. Set `true` for reliable demos if CT is slow or times out |
| `VITE_API_BASE_URL` | No | Leave unset for same-origin `/api/v1` |
| `DATABASE_URL` | For mapped ingest | Postgres connection string (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com) via Vercel Marketplace). Enables `POST /api/v1/ingest/confirm` → dashboard provenance |
| `SEED_DB` | No | Set `true` on first deploy to seed `targets` / `observations` from bundled catalog |
| `USE_DB_FALLBACK` | No | Set `true` to serve in-memory seed when Postgres is unavailable (dev/demo only) |
| `INGEST_API_KEY` | For ingest writes | Server-side key for `POST /api/v1/ingest/*` confirm/upload |
| `VITE_INGEST_API_KEY` | For ingest writes | Same value exposed to the browser for mapped file import |
| `FRONTEND_ORIGIN` | Production | Your Vercel app URL (e.g. `https://your-project.vercel.app`) for CORS |

### Postgres setup (ministry pilot)

1. Add a Postgres integration in the Vercel project (Neon, Supabase, or other).
2. Set `DATABASE_URL` from the integration (automatic on Marketplace).
3. Deploy — `api/index.js` runs migrations on cold start via `bootstrapDatabase()`.
4. Optionally set `SEED_DB=true` for the first deploy, then remove or set `false`.
5. Verify: `GET /api/v1/health/full` should report `persistence_mode: "postgres"`.

### Demo vs live emissions

| Profile | `USE_MOCK_DATA` | When to use |
|---------|-----------------|-------------|
| **Live stakeholder demo** | `false` | Pre-warm with `GET /api/v1/health/full` 2–3 min before presenting |
| **Reliable offline demo** | `true` | Bonn-style events; no Climate TRACE dependency |

Bookmark before stage time: `/api/v1/health/full` and `/dashboard?demo=1&sector=transport`

## Limits on Vercel

| Feature | Local | Vercel |
|---------|-------|--------|
| Ingest upload size | 20 MB / file | 4 MB / file |
| Ingest file count | 10 | 4 |
| Pandas charts | Yes (if Python installed) | JavaScript fallback only |
| API timeout | — | 60s max (`vercel.json`) |

For full pandas ingest and larger uploads, run the API on Railway/Render and deploy **only the frontend** to Vercel with `VITE_API_BASE_URL=https://your-api-host`.

## Local development (unchanged)

```bash
npm run dev:all
```

- Web: http://localhost:8080  
- API: http://localhost:8787/api/v1/...

## Project layout

| Path | Role |
|------|------|
| `vercel.json` | Build → `public/`, rewrite `/api/*` → `api/index.js`, SPA fallback |
| `api/index.js` | Express under `/api` + `bootstrapDatabase()` on cold start |
| `server.js` | Local `listen()` + DB bootstrap; not used by Vercel rewrites |
| `server/createApp.js` | Route definitions mounted at `/api/v1/*` and `/api/health` |

## Troubleshooting

- **404 on refresh** — SPA rewrite is in `vercel.json`; redeploy if missing.
- **404 on `/api/*`** — Ensure Vercel project **Output Directory** is empty (not `public` only). The `api/` folder must deploy alongside `public/`. `vercel.json` includes `/api/:path*` → `/api` rewrite.
- **API 500 on ingest** — PDF/large files may exceed time/size; try smaller CSV/JSON.
- **Emissions empty** — Climate TRACE may be slow; set `USE_MOCK_DATA=true` for demos.
