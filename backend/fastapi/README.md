# Backend

The **Express API** lives at the repository root (`server.js`, `routes/`, `services/`).

Run with:

```sh
npm run start:api
```

Or together with the frontend:

```sh
npm run dev:all
```

## Data sources

| Route prefix | Source |
| ------------ | ------ |
| `/api/v1/emissions/*` | Climate TRACE (live via API v7, cached in memory). Includes `sources`, `map`, `predictions`, `spatial-confidence`, `trackability`. "v7" is the API version, not the data version (data updates monthly). |
| `/api/v1/indicators/*`, `/api/v1/catalog/*` | Bundled `config/ndcCockpitCatalog.js` |
| `/api/v1/risk/*` | Bundled `data/seeds/riskSeed.js` |
| `/api/v1/mock/*` | Fixtures when `USE_MOCK_DATA=true` |
| `/api/v1/ingest/*` | Upload scan (CSV/JSON/PDF/TXT); tabular charts use **pandas** when installed |

### Ingest analysis (pandas)

For accurate CSV/JSON charts (correct year totals, sector bars for the latest year only, national-row filtering):

```sh
pip install -r requirements-ingest.txt
```

Check: `GET /api/v1/ingest/health` → `analysis.python3: true`.

Delivery activities are stored in the browser (`localStorage`) via `frontend/src/lib/activities-store.ts`.

Full feature guide: [PROJECT_DOCUMENTATION.txt](../../docs/PROJECT_DOCUMENTATION.txt). API index: [../docs/README.md](../docs/README.md).
