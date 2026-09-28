# Standalone FastAPI reference service

`backend/fastapi/` is a parallel Python implementation of core country, NDC, target, emissions, and analytics records. The default application and Vercel deployment use the Express service in `backend/`; this FastAPI service is not mounted by `npm run dev` or `api/index.js`.

## Directory map

| Path | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI application construction |
| `app/api/v1/` | Version-one HTTP endpoints |
| `app/models/` | SQLAlchemy database records |
| `app/schemas/` | Pydantic request and response validation |
| `app/db/` | Async database sessions |
| `alembic/` | Versioned Python-service database migrations |
| `tests/` | Isolated async endpoint and analytics checks |

## Run independently

Use a Python 3.11 environment, install `requirements.txt`, set the service database URL, and run its ASGI application with Uvicorn. Run `pytest` from this directory for the Python suite.

Do not assume that adding an endpoint here changes the live React application. A feature intended for production must be implemented through the shared Express runtime or the deployment must be deliberately changed, documented, and tested.

## Keeping implementations aligned

When this reference service is maintained, compare its units, target definitions, missing-data behavior, and schemas with:

- `config/ndcTargets.js`
- `config/climateTrace.js`
- `backend/routes/`
- `backend/services/`
- `shared/progress.js`
- [the codebase guide](../../docs/dev/codebase-guide.md)

The reference service must not introduce a second unofficial source for production NDC or Climate TRACE values.
