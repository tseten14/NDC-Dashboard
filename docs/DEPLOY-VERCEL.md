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
| `USE_MOCK_DATA` | No | Set `true` to use mock emissions instead of Climate TRACE live API |
| `VITE_API_BASE_URL` | No | Leave unset for same-origin `/api/v1` |

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
| `vercel.json` | Build output `frontend/dist`, SPA rewrites, API function config |
| `api/index.js` | Vercel Express entry (`/api` + `/v1` routes) |
| `server/createApp.js` | Shared route definitions |
| `server.js` | Local-only listener on port 8787 |

## Troubleshooting

- **404 on refresh** — SPA rewrite is in `vercel.json`; redeploy if missing.
- **API 500 on ingest** — PDF/large files may exceed time/size; try smaller CSV/JSON.
- **Emissions empty** — Climate TRACE may be slow; set `USE_MOCK_DATA=true` for demos.
