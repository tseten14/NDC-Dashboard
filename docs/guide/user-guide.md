# User guide (repository copy)

The **canonical** long-form guide for non-technical readers is **[PROJECT_DOCUMENTATION.txt](../PROJECT_DOCUMENTATION.txt)** — Part A (sections A1–A9): features, how each screen works, what results to expect, data honesty, and status colours.

The in-app **Documentation** tab (`/docs`) renders the same content family from [`frontend/src/data/user-guide-content.ts`](../../frontend/src/data/user-guide-content.ts). When updating help text, edit **both** that TypeScript file and **PROJECT_DOCUMENTATION.txt** § A7.

---

## Quick reference — Basic menu

| Screen | Route | What you get |
| ------ | ----- | ------------ |
| Home | `/` | Feature cards + **NDC gap priorities** (live vs indicative chips) |
| Dashboard | `/dashboard` | NDC targets vs Climate TRACE emissions; compact gap panel; export |
| Policy Impact | `/policy-impact` | Socio-economic forecast from KCI case analogies (indicative) |
| Data Ingestion | `/ingest` | Mapped import → Postgres (indicator targets); Quick Scan profiling |
| Climate Finance | `/climate-finance` | Cost/abatement screening + fund hints + MCF docs |
| AI 2030 | `/ai-2030` | Trend to 2030 with uncertainty (indicative) — sits right after Climate Finance in the nav |
| Policy documents | `/documents` | CPR corpus + intervention pathway diagram |
| Emissions Map | `/map` | Geolocated Climate TRACE sources as bubbles on a 3D satellite/terrain basemap (MapLibre GL) |

## Three layers of truth

1. **Official pledges** — Uganda NDC 2022 targets and catalogue activities (bundled in app).  
2. **Observed emissions** — Climate TRACE (live API) on Dashboard and Map.  
3. **Evidence & screening** — Policy document links (CPR export); indicative finance, Policy Impact (KCI analogies), and pathway diagram (not MRV).
4. **Ministry uploads** — Mapped ingest observations on indicator targets when Postgres is configured (provenance badge on Dashboard).

**Intended** outcomes (targets, pathway diagram) are not the same as **measured** outcomes (Climate TRACE charts).

## Policy documents

- **Document library** — filter UN Submissions, Executive, Legislative, MCF; search; open CPR or PDF.  
- **Intervention pathway** — illustrative urban transport logic model (interventions → outcomes).  
- Rebuild corpus: `npm run build:documents` with path to latest CPR CSV.

See PROJECT_DOCUMENTATION.txt § A6c–A7 for full detail.

## Dashboard pop-ups

Activities, Top emitting sources, Spatial certainty, Climate TRACE trackability, Mitigation options, Official sources — each explained in PROJECT_DOCUMENTATION.txt § A6d.

## Advanced menu

Strategy Library, My Work (browser-only), Climate Risk (illustrative seed data) — § A7 in PROJECT_DOCUMENTATION.txt.

## Developers

| Doc | Purpose |
| --- | ------- |
| [../dev/architecture.md](../dev/architecture.md) | Routes, API, folders |
| [data.md](./data.md) | Live vs indicative data |
| [../dev/deploy.md](../dev/deploy.md) | Hosting |
