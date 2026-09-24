# Sector Classification

Route: `/sector-classification`. The shared navigation registry places it after District Translator in desktop navigation, the mobile tools sheet, and the home tool catalog. Existing role visibility rules apply. The lazy route uses the app's loading and error boundaries without fetching emissions data.

The interface follows PDF page 3: framework cards on the left, an expandable sector checklist and search on the right, and one compact selection/save bar at the bottom. Fully selected branches are summarized by their parent code. “Review selection” opens the complete category list, code paths, and removal controls. Source/coverage details are behind “About this classification”; mobile framework choices are collapsible. These disclosures keep the main task focused on choosing and saving sectors.

## Classification sources

The TSV files in `frontend/src/data/classifications/` transcribe **all categories through three code segments**, e.g. `3.A.1`, plus the five sector groups. This is a scope selector, not a full detailed reporting-table editor. More detailed categories (e.g. animal species under `3.A.1`) are not selectable separately. Selecting a terminal category includes that category's scope. No emissions, facilities, units, coverage, or time series are inferred from a selection.

- [2006 IPCC Guidelines, Volume 1, Chapter 8, Table 8.2](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/1_Volume1/V1_8_Ch8_Reporting_Guidance.pdf), pages 8.10–8.33. Downloaded chapter has June 2010 correction metadata. SHA-256: `8626df5727d080b3c4f1a405d3c2eb2a0d09016608ca323d4b421d42274eb304`.
- [2019 Refinement, Volume 1, Chapter 8, Table 8.2 (Updated)](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/1_Volume1/19R_V1_Ch08_Reporting_Guidance.pdf). SHA-256: `f22427fd75d5b20e490d6717488d61f52c77cc0e2daf53dae819177f8a8a166f`.

Retrieved 2026-09-23. Each framework has a distinct, versioned TSV and source metadata. Dots separate the source's space-separated code segments. Chemical formulas use Unicode subscripts. Top-level sector names follow the readable names in section 8.2.4; other capitalization and wording follow Table 8.2, including `OTHER PRODUCT MANUFACTURE AND USE` and the 2006 table's `Rice Cultivations` (2019: `Rice Cultivation`).

At this depth, the 2019 changes include Hydrogen Production at `2.B.10` (Other moves to `2.B.11`), Rare Earths at `2.C.7` (Other moves to `2.C.8`), Displays at `2.E.2`, MEMS at `2.E.4`, and Halogenated Gases from Other Product Uses at `2.G.2`. This is why matching code strings cannot establish equivalence.

The reference design abbreviates `3.D` as “Other – harvested wood products”. The verified source has `3.D Other`, `3.D.1 Harvested Wood Products`, and `3.D.2 Other (please specify)`. The application preserves these relationships.

1996, CRT, and GPC appear disabled with reasons. National classification is not selectable because no national hierarchy and verified mapping have been supplied. No cross-framework mapping is claimed: switching between the two loaded frameworks lists every selected terminal category and requires confirmation before clearing current edits. The saved record changes only upon Save selection.

## Persistence and integration contract

The app's AuthGate currently passes through and has no remote account identity. Consistent with existing local activity storage, selections are stored in `localStorage`, per country, under `ndc-sector-classification-v1:<countryCode>`. They are shared by roles in that browser, survive refresh/navigation, and do not sync across devices. Unsaved edits are component state; the UI tells users to save before leaving and guards browser unload while dirty.

`readClassificationSelection(countryCode)` returns a validated `ClassificationSelection` or null. It throws for blocked storage, corrupt data, unknown frameworks, mismatched country/schema/hierarchy versions, duplicate codes or unrecognized categories. The UI offers retry and requires explicit consent to replace unreadable data. Failed writes preserve edits and show an actionable error without claiming success. An empty saved selection is valid so users can clear a previous selection.

The persisted record carries `schemaVersion`, `countryCode`, `frameworkId`, `hierarchyVersion`, `selectedCodes` (terminal codes in source order), and ISO `savedAt`. Parent state is derived from descendant membership, avoiding contradictory parent/child entries. On success, `saveClassificationSelection` dispatches `ndc:classification-saved` with the record in `event.detail`. Future same-window consumers can listen for this event and read the store; other tabs can use the browser's storage event. These APIs are defined in `frontend/src/lib/sector-classification.ts`.

Before adding a hierarchy or modifying its codes, version its data, validate the full saved contract, and implement explicit migration. Do not reinterpret saved selections with a changed tree. Future server persistence must use a real account identity, validate hierarchy versions server-side, and define conflict handling.

## Downstream integration

The existing District Translator uses Climate TRACE sectors; the prediction page uses its own forecast sectors. Neither supplies a verified crosswalk at IPCC category depth. Activity tickets and observed indicator ingestion are not an inventory exercise model. Therefore the feature does not change those screens' filters or figures.

To implement the PDF's remaining inventory steps, consume the saved contract and provide verified reporting-code mappings, inventory exercise IDs, source/time-series storage, district/facility observations, recalculation methods with lineage, and a real review/submission API. Scenario integration additionally requires a compatible inventory basis and verified sector/action/policy models. No placeholder Continue action or fictional totals are provided.

## Checks

- `npm test`: hierarchy invariants, official framework differences, cascading/partial selection, search, safe switching, persistence validation, save failures, corrupted-state recovery, and navigation regressions.
- `npm run test:ux -- sector-classification`: real-browser desktop, phone, and tablet checks, keyboard operation, reload/navigation persistence, framework-switch confirmation, and screenshots in `test-results/`.
- With the development server running, `NDC_UX_BASE_URL=http://localhost:8080 npm run test:ux -- sector-classification` runs the same checks against Vite development modules and rejects failed dependency/module responses. The Vite configuration explicitly optimizes the dialog and radio controls at startup to avoid stale dependency URLs when first entering the lazy route.
- `npx tsc --build --force`, `npm run lint`, and `npm run build`.
