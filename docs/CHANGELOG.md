# Changelog

All notable changes to the Uganda NDC Data Explorer are documented here.

## [Unreleased]

### Performance

Measured on a throttled connection (1.6 Mbps, 4x CPU slowdown) — the situation
that matters for this app's users, not a fast office link. Dashboard, median of
five runs:

| | Before | After |
| --- | --- | --- |
| Fully loaded | 4653 ms | 3247 ms |
| Requests | 44 | 26 |
| First paint | 592 ms | 668 ms |

- **Export libraries no longer load with the dashboard.** `NDCLayer` imported the
  PDF/spreadsheet toolchain (~235 kB) at the top of the file, so every visitor
  downloaded it just to look at the page — and it was the *last* thing to finish,
  holding the load up by ~2.5 s for a feature most visits never use. It now loads
  when someone picks an export format. Same fix applied to the six other screens
  that did this.
- **Icon chunks bundled.** Each icon is its own module and different lazy screens
  use different icons, so Rollup was emitting 39 chunks under 2 kB. Over a
  high-latency link each is a round trip costing far more than its bytes.
- **Context no longer rebuilds every render.** `EmissionsDataContext` fell back to
  freshly-created `{}` and `[]` while data was loading. Both feed the context
  `useMemo`, so a new reference each render rebuilt the context and re-rendered
  every screen reading from it — continuously, for as long as loading took.
- **Data-fetching defaults set.** The query client had none, so React Query's
  defaults applied: refetch on every window focus. Switching tabs and back
  re-fetched the dashboard. Now 5-minute freshness, no refetch on focus.
- **Long-lived caching for build assets** (`vercel.json`). Output filenames are
  content-hashed, so they are now served `immutable` for a year, with
  `index.html` explicitly revalidated so a new deploy is still picked up.

Hand-written vendor chunk groups were tried and **reverted** — they delayed first
paint by ~220 ms for no measurable gain. The reasoning and numbers are recorded in
`frontend/vite.config.ts` so the experiment is not repeated.

### Bug fixes

- **`npm run preview` could not reach the API.** The preview server had no proxy
  config, so every data request 404'd and the production build rendered empty —
  making it useless for checking a build before deploy.
- **Role switcher squeezed the mobile nav.** Fixed at 180 px it took nearly half a
  390 px screen, clipping the navigation links beside it.

### Bug fixes

- **`npm run dev` could never complete.** The prediction verifier parsed the backtest
  metrics table with a digits-only pattern, so it silently failed to match the routinely
  negative R² column, reported "0 eval points", and exited non-zero — taking the whole dev
  bootstrap down with it. Numbers are now parsed with sign, exponent and `nan`/`inf`
  handling (`scripts/verify_predictions.mjs`).
- **Model quality gate replaced.** The same script gated on pooled R² > 0.5. Pooled R² is
  not a valid skill measure here: it is pooled across sectors spanning two orders of
  magnitude and dominated by the land-sector net flux, which legitimately changes sign year
  to year, so it reads negative even when every sector is tracked well. The gate is now
  skill against the naive persistence baseline — the standard test for short annual series
  — and R² is retained as a reported diagnostic.
- **Land-sector sinks were flagged as impossible data.** The accuracy guardrails treated
  every negative value as a unit or sign error, so Climate TRACE's genuine AFOLU net
  removals (2018, 2019, 2021, 2024) raised console errors on live data, and would have
  thrown in test mode. Negatives are now an error only for gross-source sectors; net-flux
  sectors are allowed to go below zero, and magnitude is bounded in *both* directions so a
  real unit error at implausible scale is still caught
  (`frontend/src/lib/data-validation.ts`).
- **Rate limits were global, not per visitor.** Express was never told how many proxies sit
  in front of it, so on Vercel it read the proxy's own address for every request and the
  entire user base shared one 200-request budget. Now configured via `TRUST_PROXY_HOPS`
  (default 1 on Vercel, 0 locally), counting hops rather than trusting all of them so the
  header cannot be forged to evade the limiter (`backend/server/createApp.js`).
- **Ingest integration test passed exactly once per machine.** It wrote into the real
  `data/ingest-observations.json`, so its rows survived the run and every later run got a
  409 conflict from `/ingest/confirm`. The file-mode store path is now overridable with
  `INGEST_STORE_PATH`, and the test uses a throwaway file it cleans up.
- **`npm run test:e2e` always failed** with "No tests found" — the config pointed at a
  directory holding only an unused helper. Added a browser smoke suite covering the country
  gate, dashboard, target selection, map, and uncaught page errors.
- Fixed all 18 ESLint errors (`no-explicit-any`, empty interfaces) by using the concrete
  types that already existed.

### Documentation

- Plain-language header comments added to every source file (~210), written for readers who
  are not developers: what the file is for and why it matters, not a restatement of the
  code.
- README corrected: the scripts table described `npm run dev:all` (which no longer exists)
  and called `npm run dev` "frontend only". Added the environment switches and the
  `trust proxy` note.

### NDC AI — verified citations (Dashboard)

- **Fact ledger** (`frontend/src/lib/dashboard-ai-facts.ts`): every quotable dashboard number is pre-mapped to an exact Climate TRACE v7 API URL or UNFCCC NDC PDF before the AI runs.
- **POST `/api/v1/dashboard/analyze`** (`routes/dashboardAi.js`, `services/dashboardAiCitations.js`): Perplexity-style prose with per-paragraph citation pills; backend resolves `fact_*` ids deterministically and flags unverified numbers.
- **UI:** `DashboardAnalyzePanel.tsx` — quick actions + chat; sources footer lists domains used.

### Policy documents — CPR passages + MCF

- **Key documents (CPR) tab:** passage/topic search from `npm run build:passages`; empty list until search; grouped results by document.
- **Climate fund projects tab:** searchable MCF corpus from `npm run build:mcf` (~167 projects).
- **Document AI:** `contentUrl` resolved via `catalogId`; improved error copy when PDF missing.

### Demo removal

- Removed presenter/demo mode, Brazil Climate Intelligence (`/brazil-chat`), and all demo UI badges.
- Role switcher is local permissions only (no “demo mode” labelling).

### Navigation

- **Top nav order:** Home → **Emissions Map** → Dashboard → … (Emissions Map moved next to Home).
- Footer height reduced slightly.

### Emissions map

- Click popup: compact frosted card; removed generic “distributed area emissions” footer line.
- Climate TRACE public inventory URLs fixed to `climatetrace.org/inventory?country=UGA&sector=...`.

### Documentation

- Updated `PROJECT_DOCUMENTATION.txt`, `docs/dev/system-design.md`, `user-guide-content.ts`, `architecture.md`.

## [Unreleased — prior]

### Emissions Map — 3D overhaul (`/map`)

- **Replaced the Three.js / `globe.gl` 3D globe with MapLibre GL JS.** The old globe
  rendered the country as a floating extruded shape on a Blue-Marble sphere with no
  real basemap; it was heavy (full WebGL scene + per-point merged geometry) and the
  extrusion looked distorted.
- **Real 3D satellite basemap.** Esri World Imagery satellite raster tiles with AWS
  "terrarium" terrain DEM for genuine relief — both keyless/free (no Mapbox token
  required). A sky/atmosphere layer completes the 3D look.
- **Accurate geography & framing.** The camera fits Uganda's bounding box with a
  pitched (55°) perspective, so the country fills the view at the correct aspect
  ratio and zoom regardless of container size. Web Mercator projection (not a hand-
  placed mesh) means borders line up with the imagery.
- **Performance.** Emission sources render as a single GPU circle layer styled
  entirely from precomputed feature properties (radius ∝ √emissions, colour by
  sector). Updates are one `setData` call — no per-frame JS — so thousands of
  sources stay smooth. Pixel ratio capped at 1.5.
- **Interactions preserved.** Hover tooltips, sector highlight/dimming and filtering
  work as before via `queryRenderedFeatures` on the bubble layer.
- New component `frontend/src/components/map/EmissionsMap3D.tsx` (replaces
  `EmissionsGlobe.tsx`, now removed). MapLibre is dynamically imported, so it is
  code-split into its own chunk loaded only on `/map`.

### Site-wide animation & scroll performance

- **Removed continuous full-viewport repaints.** `.dash-animated-bg` and
  `.landing-gradient-bg` animated `background-position` over an oversized gradient,
  forcing a whole-viewport repaint every frame on every page. These are now static
  gradients (the drift was imperceptible at 18–26s).
- **Ambient orbs are now compositor-only.** Drift keyframes animate `translate3d`
  instead of `transform … scale()` — scaling a 64px-blurred orb re-rasterized the
  blur each frame. Orbs are promoted to their own GPU layer (`will-change: transform`)
  and the ambient container is isolated with `contain: layout paint`.
- **Scroll listeners rAF-batched.** `TopNav` (header condense) and `ScrollToTopButton`
  now read `scrollTop` at most once per frame via `requestAnimationFrame` and use
  passive capture listeners, eliminating per-event forced layout reads.
- **Lighter sticky header.** `TopNav` backdrop blur reduced from `blur-xl` to
  `blur-md`; a sticky element's `backdrop-filter` is recomputed every scroll frame.
- **Hero reveal cheaper.** Removed the per-word `filter: blur()` from the hero word
  animation (kept opacity/translate).
- **Smaller initial bundle / faster hydration.** Heavy secondary pages
  (AI 2030 Prediction, Climate Finance, Policy Impact, Policy Documents, Policy
  Document View, Documentation) are now `React.lazy` code-split
  instead of eagerly imported, so they no longer block first paint.
- Scroll reveals continue to use `IntersectionObserver` (`use-scroll-reveal`) and all
  changes respect `prefers-reduced-motion`.

### Navigation

- **Reordered primary nav:** "AI 2030 Prediction" now sits immediately to the right of
  "Climate Finance" in both the top nav (`TopNav.tsx`) and the sidebar
  (`AppSidebar.tsx`). Routing and active-state logic are URL-based and unaffected.

### Data Ingestion — "About this file" summary (`/ingest` Quick Scan)

- **Rewrote the AI summary prompt** (`routes/ingest.js`). The "About this file" text
  now explains what the dataset/document *is* in the context of climate policy
  tracking, what its contents mean, and how a policy team would use it — instead of
  describing row/column counts, field names, or file structure.

### Docs

- Updated `README.md`, `docs/USER_GUIDE.md`, and the in-app user guide
  (`user-guide-content.ts`) to reflect the new map (3D satellite basemap), the nav
  order, and the revised ingestion summary behaviour.
