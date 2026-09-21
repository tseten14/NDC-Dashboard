# Workspace quality refresh

Verified 20 September 2026. This work improves the shared application shell; it is not a guarantee that every route is defect-free or a substitute for a penetration test.

## Interface and accessibility

- Stable header with visible Home, Emissions Map, District Translator, Dashboard, and Database shortcuts. The grouped All tools drawer exposes every role-appropriate tool without hidden horizontal scrolling.
- Mobile navigation includes country and role controls, keyboard dismissal, focus trapping, and focus restoration. Route navigation moves focus into main content; a skip link bypasses the header.
- Homepage prioritizes tasks rather than decorative statistics. Shared light/dark colors, contrast, spacing, button targets, and footer styling apply across the site.
- Reduced-motion preferences suppress decorative animation. The continuously animated ambient layer and scroll-triggered header resizing are removed from the shared shell.
- District Translator has a scrollable phone layout and direct Area tools / Map / Insights section links. Its provenance and spatial limitations remain visible and included in exports.
- Existing Marketplace work, including deal-detail routing, is preserved.

## Loading and recovery

- National emissions context loads only for `/dashboard`, `/ndc`, `/library`, and `/exports`. The home, documentation, map, and translator pages no longer start unrelated national dashboard, catalog, district-list, or health queries.
- Activity editing/detail screens and the emissions provider are lazy-loaded. New routes that consume `useEmissionsData` must also be registered in `frontend/src/lib/route-data.ts`.
- The main entry bundle decreases from approximately 575.7 kB to 494.9 kB uncompressed (174.6 kB to 153.4 kB gzip). This is a build-size measurement, not a claim of identical latency improvements on all devices or networks.
- Loading placeholders, route-scoped error recovery, and safe optional browser preferences prevent blank screens from common failures.
- Automatic stale-chunk reloads are limited to one per browser session. If storage is unavailable, recovery stays manual instead of entering a reload loop.
- Both maps share `frontend/src/lib/maplibre.ts`, which configures the separate MapLibre v6 worker through Vite's `?worker&url` pipeline. Importing MapLibre directly for a new map without this setup can show raster tiles while silently losing vector overlays.

## Security

- Patched maps, routing, upload handling, spreadsheet exports, test tooling, and compatible transitive dependencies. SheetJS 0.20.3 uses the publisher's versioned distribution rather than the outdated npm registry release.
- `npm audit --omit=dev`: **0 reported vulnerabilities**. The full dependency audit retains **4 moderate findings** in the development-only Drizzle → legacy esbuild dependency chain. No high or critical findings remain. A forced audit fix suggests an incompatible Drizzle downgrade and is deliberately not applied. Do not expose Drizzle Studio or development servers to untrusted networks.
- The Vite development host defaults to loopback. Production/Vercel origin allowlists no longer implicitly trust localhost; malformed origins, credentials, wildcard entries, and path-bearing origins are rejected.
- The production content security policy keeps scripts restricted to the same origin and permits only the specific imagery/elevation endpoints required by the existing map. Future Planet integration must add only its required, reviewed endpoints; credentials belong on the server.
- Role selection remains a workspace preference, **not authentication or authorization**. Existing protected server actions still require operator authorization. Multi-user identity and per-user authorization need a separate design before private user data is introduced.
- The production bundle secret scan passes. No server-side credentials were added to frontend code.

References: [MapLibre security advisory](https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579), [MapLibre v6 migration](https://maplibre.org/maplibre-gl-js/docs/guides/v5-to-v6-migration-guide/), [Vite worker setup](https://maplibre.org/maplibre-gl-js/docs/), [SheetJS distribution](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).

## Verification

- 236 unit/API tests pass; 1 existing test is skipped.
- TypeScript and production build pass. Lint has 0 errors and 25 existing Fast Refresh warnings.
- Production bundle secret scan passes.
- Five desktop/phone browser checks pass, covering navigation, active role, light/dark themes, keyboard focus, no horizontal overflow, no unnecessary homepage data requests, deferred dashboard/reporting data, live Kampala insights, CSV/GeoJSON downloads, worker loading, and selection by clicking the rendered district boundary.
- Live Kampala export retains 27 mapped records, 196.16260916039903 km², and 0.9775321395214746 MtCO₂e for 2025. These are mapped-source results, not a complete district inventory.

Run `npm test`, `npx tsc --build --force`, `npm run lint`, `npm run build`, and `npm run scan:secrets` for local checks. With a live-data API running on port 8787 and a current production build, run `npm run test:ux`. Its dedicated configuration uses the production preview on port 4173 and performs read-only analysis requests. Ensure any existing preview on that port serves the current build. These live browser tests are separate from the mock-backed `npm run test:e2e` suite.

Planet remains a later adapter. The translator provider contract, units, provenance, coverage distinctions, and explicit separation of point aggregation from future raster statistics remain unchanged.
