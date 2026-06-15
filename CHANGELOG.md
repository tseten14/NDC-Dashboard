# Changelog

All notable changes to the Uganda NDC Data Explorer are documented here.

## [Unreleased]

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
  Document View, Documentation, Brazil Chatbot) are now `React.lazy` code-split
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
