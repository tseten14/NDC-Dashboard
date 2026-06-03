# User guide (repository copy)

The canonical user-facing guide lives in the app: **Sidebar → Documentation** (`/docs`).

This file is a lightweight mirror for stakeholders who read the repo without running the app.

## Who this app is for

Ministry staff, MRV officers, programme managers, and partners who need to see whether Uganda’s **NDC pledges** align with **observed emissions** (Climate TRACE) and related delivery data.

## Main screens (Basic menu)

| Screen | In one sentence |
| ------ | ---------------- |
| **Home** | Welcome and shortcuts — not the data workspace. |
| **Dashboard** | Pick a sector and an NDC target; see charts and progress. |
| **Data Ingestion** | Upload files — **Quick Scan** works; full mapped import is not ready yet. |
| **AI 2030 Prediction** | Trend forecast to 2030 with uncertainty — indicative only. |
| **Climate Finance** | Screening tool for project costs and carbon revenue — not investment advice. |
| **Emissions Map** | Map of Uganda with emission sources as coloured bubbles. |
| **Documentation** | Explains terms, colours, and menus (this guide in the UI). |

## Dashboard in 30 seconds

1. Choose **Sector** (e.g. AFOLU).
2. Click one **NDC target** card on the left (one click).
3. Read **Observed Data** (centre) and **Progress** (right).

**Geography:** National = whole Uganda. District = one district’s observed emissions for context (NDC targets stay national).

## Colours

| Label | Meaning |
| ----- | ------- |
| On track | Within reach at current pace (check data quality). |
| At risk | Concerning trend or weak data. |
| Off track | Far from the 2030 goal. |
| IMPL. GAPS | No linked delivery activity in catalogue. |
| MRV GAPS | Activities exist but observed data is thin. |

## Abbreviations

| Term | Meaning |
| ---- | ------- |
| NDC | Uganda’s climate pledge under the Paris Agreement (2022 update in this app). |
| MtCO₂e | Million tonnes of CO₂ equivalent. |
| AFOLU | Agriculture, forestry and other land use. |
| MRV | Measurement, reporting and verification. |
| Climate TRACE | Independent global emissions estimates (satellites + models). |

## Roles (demo)

The top-right role switch changes what you can edit (e.g. create activities vs read-only). It does not change national totals.

## Data trust

- **Emissions:** Climate TRACE (live API), labelled on screen.
- **Targets & catalogue:** Uganda NDC and project catalogues — see `docs/DATA_AND_CATALOG.md` for what is audited vs indicative.

For full detail, open `/docs` in the running application.
