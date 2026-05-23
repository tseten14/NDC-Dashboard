# Uganda NDC Data Explorer

Web application for exploring Uganda’s Nationally Determined Contribution (NDC) data: decision-support cockpit, strategy library, climate risk views, and role-based delivery tools.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind / shadcn
- **API:** Express (`server.js`) — Climate TRACE v7 live + bundled catalog/risk data
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
| Observed emissions / progress | Express → [Climate TRACE v7](https://api.climatetrace.org/v7/docs/index.html) |
| Activities & mitigation catalog | Express → `config/ndcCockpitCatalog.js` |
| Climate risk map | Express → `data/riskSeed.js` |
| My Work / activities | `localStorage` in this browser |

Set `USE_MOCK_DATA=true` in `.env` for offline fixture mode (no Climate TRACE calls).

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
