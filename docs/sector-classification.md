# Sector Classification

Route: `/sector-classification`. The tab now opens an **Exercises** workspace: create a named collection round, resume a saved round, or explore an explicitly synthetic sample. Each exercise connects classification, annual source comparisons, district and entry decisions, recalculation, and review. See [Inventory exercise workflow](inventory-exercises.md) for the data contract, calculation definitions, and operating limits.

The shared navigation registry still places Sector Classification after District Translator. Step 1 retains the verified framework cards, expandable sector checklist, search, and framework-switch confirmation. Changing a scope with imported data creates a separate exercise and preserves the original. The legacy standalone selection is offered as an optional starting scope for new exercises.

## Classification sources

The TSV files in `frontend/src/data/classifications/` transcribe **all categories through three code segments**, e.g. `3.A.1`, plus the five sector groups. This is a scope selector, not a full detailed reporting-table editor. More detailed categories (e.g. animal species under `3.A.1`) are not selectable separately. Selecting a terminal category includes that category's scope. No emissions, facilities, units, coverage, or time series are inferred from a selection.

- [2006 IPCC Guidelines, Volume 1, Chapter 8, Table 8.2](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/1_Volume1/V1_8_Ch8_Reporting_Guidance.pdf), pages 8.10–8.33. Downloaded chapter has June 2010 correction metadata. SHA-256: `8626df5727d080b3c4f1a405d3c2eb2a0d09016608ca323d4b421d42274eb304`.
- [2019 Refinement, Volume 1, Chapter 8, Table 8.2 (Updated)](https://www.ipcc-nggip.iges.or.jp/public/2019rf/pdf/1_Volume1/19R_V1_Ch08_Reporting_Guidance.pdf). SHA-256: `f22427fd75d5b20e490d6717488d61f52c77cc0e2daf53dae819177f8a8a166f`.

Retrieved 2026-09-23. Each framework has a distinct, versioned TSV and source metadata. Dots separate the source's space-separated code segments. Chemical formulas use Unicode subscripts. Top-level sector names follow the readable names in section 8.2.4; other capitalization and wording follow Table 8.2, including `OTHER PRODUCT MANUFACTURE AND USE` and the 2006 table's `Rice Cultivations` (2019: `Rice Cultivation`).

At this depth, the 2019 changes include Hydrogen Production at `2.B.10` (Other moves to `2.B.11`), Rare Earths at `2.C.7` (Other moves to `2.C.8`), Displays at `2.E.2`, MEMS at `2.E.4`, and Halogenated Gases from Other Product Uses at `2.G.2`. This is why matching code strings cannot establish equivalence.

The reference design abbreviates `3.D` as “Other – harvested wood products”. The verified source has `3.D Other`, `3.D.1 Harvested Wood Products`, and `3.D.2 Other (please specify)`. The application preserves these relationships.

1996, CRT, and GPC appear disabled with reasons. National classification is not selectable because no national hierarchy and verified mapping have been supplied. No cross-framework mapping is claimed: switching between the two loaded frameworks lists every selected terminal category and requires confirmation before clearing current edits. The saved record changes only upon Save selection.

## Persistence and integration contract

Exercises are validated and saved per country under `ndc-inventory-exercises-v1:<countryCode>`. The app's AuthGate currently passes through; there is no remote account identity or inventory submission service. Exercises are therefore local to this browser, shared by its roles, and do not sync across devices. JSON backup export and restoration are available. Failed writes preserve in-memory edits and expose retry/export actions. Concurrent changes from another tab block overwriting stored records.

The legacy `readClassificationSelection` / `saveClassificationSelection` contract remains available under `ndc-sector-classification-v1:<countryCode>`. It carries `schemaVersion`, `countryCode`, `frameworkId`, `hierarchyVersion`, `selectedCodes`, and ISO `savedAt`. It is used to seed an exercise only when the user chooses to inherit it. New exercise changes belong to the exercise, not the old standalone selection.

No Climate TRACE-to-IPCC crosswalk is inferred. Candidates are explicitly imported annual observations using the exercise's selected terminal codes. No dashboard or prediction figures are changed. The guided sample is isolated from live data and marked synthetic throughout the workflow and exports.

## Checks

- `npm test`: existing classification behavior, numerical statistics, import validation, geography and entry completeness, mix decisions, recalculation methods, review invalidation, storage failure and concurrent-tab protection.
- `npm run test:ux -- sector-classification`: browser exercise creation, reload persistence, CSV validation, district/entry choices, calculation, sign-off package download, backup restoration, SVG chart export, and phone/tablet layouts.
- `npx tsc --build --force`, `npm run lint`, and `npm run build`.
