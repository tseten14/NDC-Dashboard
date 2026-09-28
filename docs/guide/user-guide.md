# User guide (repository copy)

The **canonical** application and engineering guide is **[NDC-Data-Explorer-Complete-Guide.pdf](../NDC-Data-Explorer-Complete-Guide.pdf)**. It covers the user workflow, features, data interpretation, architecture, and Climate TRACE integration in one document.

The in-app **Documentation** page (`/docs`) renders the user guide and route directory from the frontend, the [codebase guide](../dev/codebase-guide.md), and the [system design](../dev/system-design.md). Keep these sources aligned with the application.

No site-wide account is required at present. Choose Uganda, then use the role selector in the top bar as a workspace preference. **All tools** opens Explore, Plan & deliver, and Manage & learn; role selection changes visible tools but is not authorization for protected writes. Data Ingestion and other operator actions retain a separate server-side unlock.

---

## Quick reference — Basic menu

| Screen | Route | What you get |
| ------ | ----- | ------------ |
| Home | `/` | Feature cards + **NDC gap priorities** (live vs indicative chips) |
| Emissions Map | `/map` | Located Climate TRACE sources on a map; not a complete territorial total |
| District Translator | `/district-translator` | Choose a district by name or boundary for mapped source insights; custom drawing is temporarily hidden |
| Sector Classification | `/sector-classification` | Reporting codes and sector choices |
| Scenario Analysis | `/scenario-analysis` | Compare actions, timing, and policy evidence |
| Dashboard | `/dashboard` | NDC targets vs Climate TRACE emissions; compact gap panel; export |
| Policy Impact | `/policy-impact` | Unavailable until quantitatively verified case evidence is connected |
| Data Ingestion | `/ingest` | Operator-unlocked Quick scan (opens first) and Data Pipeline import → Postgres |
| Climate Finance | `/climate-finance` | Partial register of provider-sourced commitments |
| AI 2030 | `/ai-2030` | Trend to 2030 with uncertainty (indicative) |
| Policy documents | `/documents` | CPR corpus + intervention pathway diagram |
| Marketplace | `/mwp-marketplace` | Database-backed user project records; unavailable without persistence |
| Database | `/my-work` | Browser-local activity drafts and submissions |

## Four layers of truth

1. **Official pledges** — Uganda NDC 2022 targets and catalogue activities (bundled in app).  
2. **Observed emissions** — Climate TRACE aggregate API for Dashboard totals; located source records for Map and District Translator. The two products have different spatial coverage.
3. **Evidence and workflow** — Policy document links, the partial sourced finance register, user records, and explicit unavailable states where verified evidence is absent.
4. **Ministry uploads** — Mapped ingest observations on indicator targets when Postgres is configured (provenance badge on Dashboard).

**Intended** outcomes (targets, pathway diagram) are not the same as **measured** outcomes (Climate TRACE charts).

## Policy documents

- **Document library** — filter UN Submissions, Executive, Legislative, MCF; search; open CPR or PDF.  
- **Intervention pathway** — illustrative urban transport logic model (interventions → outcomes).  
- Rebuild corpus: `npm run build:documents` with path to latest CPR CSV.

See the complete PDF, Sections 2 and 6, for full detail.

## Dashboard pop-ups

Activities, Top emitting sources, Spatial certainty, Climate TRACE trackability, Mitigation options, Official sources — each explained in the complete PDF, Sections 2 and 4.

## Additional pages

Strategy Library and supporting workflow pages are linked from the complete route directory in `/docs`. Climate Risk and unsupported legacy analysis pages show an unavailable state until verified sources are connected. The site does not have a persistent advanced sidebar.

## Developers

| Doc | Purpose |
| --- | ------- |
| [../dev/architecture.md](../dev/architecture.md) | Routes, API, folders |
| [data.md](./data.md) | Live vs indicative data |
| [../dev/deploy.md](../dev/deploy.md) | Hosting |
