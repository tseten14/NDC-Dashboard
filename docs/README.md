# Documentation index

| Document | Audience | Purpose |
| -------- | -------- | ------- |
| [../PROJECT_DOCUMENTATION.txt](../PROJECT_DOCUMENTATION.txt) | **Everyone (primary)** | Full non-technical feature guide (Part A) + technical API/config reference (Part B) |
| [../README.md](../README.md) | Developers | Quick start, stack, NDC targets, navigation |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Developers | Repo layout, routes, state, dev proxy |
| [USER_GUIDE.md](./USER_GUIDE.md) | Non-technical users | Short index; points to PROJECT_DOCUMENTATION.txt for detail |
| [DATA_AND_CATALOG.md](./DATA_AND_CATALOG.md) | MRV / data teams | Live vs indicative vs localStorage |
| [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) | DevOps | Vercel deployment |
| [Climate-TRACE-Data-Gaps-and-Requests.txt](./Climate-TRACE-Data-Gaps-and-Requests.txt) | Product / CT liaison | Known gaps and upstream requests |

## In-app user guide

The `/docs` tab renders `frontend/src/data/user-guide-content.ts`. It should stay aligned with **PROJECT_DOCUMENTATION.txt** Part A (especially § A7).

## Keeping docs in sync

When adding a **primary** sidebar route or API:

1. `frontend/src/App.tsx`, `AppSidebar.tsx`
2. `PROJECT_DOCUMENTATION.txt` (A6a routes, A7 feature entry, Part B API)
3. `docs/ARCHITECTURE.md`, `README.md`
4. `frontend/src/data/user-guide-content.ts` (in-app /docs)
5. `docs/DATA_AND_CATALOG.md` if data honesty changes
