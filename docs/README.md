# Documentation index

This folder and the files below describe the **Uganda NDC Data Explorer** for developers, deployers, and non-technical stakeholders.

| Document | Audience | Purpose |
| -------- | -------- | ------- |
| [../README.md](../README.md) | Developers | Quick start, stack, NDC target table, API overview |
| [../PROJECT_DOCUMENTATION.txt](../PROJECT_DOCUMENTATION.txt) | Everyone | Long-form non-technical + technical reference (plain English + API detail) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Developers | Repo layout, routes, state, data flow |
| [USER_GUIDE.md](./USER_GUIDE.md) | Non-technical users | What each screen means (mirrors in-app **Documentation** tab) |
| [DATA_AND_CATALOG.md](./DATA_AND_CATALOG.md) | MRV / data teams | What is live vs indicative vs local-only |
| [DEPLOY-VERCEL.md](./DEPLOY-VERCEL.md) | DevOps | Vercel deployment |
| [Climate-TRACE-Data-Gaps-and-Requests.txt](./Climate-TRACE-Data-Gaps-and-Requests.txt) | Product / CT liaison | Known gaps and upstream data requests |

## In-app user guide

End users should open **Documentation** in the sidebar (`/docs`) for the most up-to-date plain-English help (roles, colours, menu items, glossary).

## Keeping docs in sync

When you add a **primary** sidebar route or API under `/api/v1/emissions/*`, update:

1. `frontend/src/App.tsx` (route)
2. `frontend/src/components/AppSidebar.tsx` (nav)
3. `docs/ARCHITECTURE.md` (routes table)
4. `README.md` (if user-facing or API)
5. In-app `frontend/src/pages/Documentation.tsx` (menu guide section)
