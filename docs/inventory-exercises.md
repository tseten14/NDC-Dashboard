# Inventory exercise workflow

The Sector Classification tab starts with named exercises. A blank exercise uses imported observations; the optional livestock sample contains synthetic estimates for eight illustrative districts and one terminal category. Sample labels persist through the workflow, backup and sign-off exports.

## Customer workflow

1. **Classification & sector:** select the verified IPCC hierarchy and reporting categories. An existing standalone selection can seed a new exercise. Saving commits the scope; Continue commits and advances. Changes to a scope with imported data create a separate exercise, preserving the original.
2. **Time series:** import collected reference data and up to two candidates. Compare annual series, residuals or scatter plots; export CSV data or an SVG chart. Screen sources using configurable R², MAPE, bias and coverage thresholds. Review districts with search, review-only filtering and worst-fit sorting. Auto-assignment selects the passing candidate with the lowest MAPE and otherwise retains collected data.
3. **Entry review:** inspect entry IDs shared across sources, missing entries and candidate-only entries for a chosen year. Choose one source per entry or explicitly exclude it; use bulk selection and leave individual or district notes. Applying the entry mix replaces that district's source assignment. Decisions apply across the full reporting period.
4. **Recalculation:** configure the method, source-change year and historical range; inspect actual before/after values, base-year effects and trend. Append officer notes to the report justification. Apply only after resolving missing data and invalid method prerequisites.
5. **Review & submit:** inspect every selected category's basis, reporting-area assignments, calculation status and focal point. Open category rows to resolve issues. Export the inventory basis as CSV, inspect local history, and prepare a JSON sign-off package after completing compiler checks and naming a reviewer.

Preparing a package marks the exercise **Ready for sign-off** locally and downloads its data. It does not send messages or submit to an external authority. Actual delivery and approval remain in the institution's reporting process; authenticated multi-user storage and remote submission need a backend integration.

## Import contract

UTF-8 CSV columns:

`category,district,entry_id,entry_name,year,value,unit,basis`

- Category must be a selected terminal code in the exercise's versioned hierarchy.
- Each source requires a user-supplied name and release/survey version; import timestamps are recorded.
- Each category/district/entry/year tuple must be unique. Files support at most 50,000 rows and 10 MB.
- Values must be finite numbers; signed removal estimates are allowed. Years must be integers from 1900 to 2200.
- Comparable sources must share the same explicit unit and measurement basis (including gas and GWP convention). No conversion from activity to emissions or automatic unit/GWP harmonization is performed.
- Use `National` for national-only data. National totals and district observations cannot coexist across comparable sources; this prevents adding national totals to district totals.
- Stable entry IDs establish matches. Names are display labels, not fuzzy matching keys. Upload detail entries or totals, never both. Scope, facility boundaries and methodological equivalence require compiler review.
- Missing observations are omitted and remain gaps. A zero value is valid only when the source actually reports zero. All entries observed for a source/area must have an explicit value in a year for its total to be complete.
- Reference reporting areas define the comparison geography. Candidate-only areas outside this geography are not added to national totals. Update the collected reference scope if those areas belong in the inventory.
- A surrogate indicator is a separate optional source slot and may have a different unit/basis. Its geographic observations must cover the reference areas.

Replacing source observations preserves the current choices but invalidates calculation approval. Review new gaps and entry coverage before applying again.

## Calculation definitions

Statistics use only year-aligned pairs with available values. National series are sums across the reference reporting areas; a missing area or entry makes that year's total unavailable.

- **R²:** `1 − Σ(candidate − reference)² / Σ(reference − mean(reference))²`. This is predictive goodness of fit, not squared Pearson correlation. It can be negative. Requires at least three paired years and nonzero reference variance.
- **MAPE:** mean absolute relative error × 100; pairs with a zero reference are excluded and their count is shown.
- **Bias:** `100 × Σ(candidate − reference) / Σ|reference|`. Undefined when the denominator is zero.
- **RMSE:** square root of mean squared error over paired observations.
- **Year coverage:** paired years / years with reference data × 100.
- A candidate passes a district only if all metrics are defined and meet the exercise thresholds, including year coverage. A national recommendation additionally requires the configured proportion of districts to pass. Defaults are screening preferences, not official acceptance standards.

## Recalculation methods

The method options follow the types described in [IPCC 2006 Guidelines, Volume 1, Chapter 5](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/1_Volume1/V1_5_Ch5_Timeseries.pdf). Method suitability, trend stability and indicator correlation require expert assessment; passing a numerical completeness check does not establish methodological consistency.

- **Keep collected basis:** available when every reporting area retains collected data. Requires a justification and explicit application.
- **Overlap:** multiply earlier reference estimates by the arithmetic mean of annual new/old ratios over the configured overlap. This implementation requires at least three nonzero paired years, all before the source change. New estimates are used from the change year onward.
- **Surrogate:** scale the imported indicator relative to its nonzero value in the source-change year, anchored to that year's new estimate. Missing indicators remain gaps. The user documents why the indicator is suitable.
- **Interpolation:** retain known new-basis values and linearly interpolate only between bracketing known years. No endpoint extrapolation occurs.
- **Full recalculation:** use the imported new-basis estimates directly for the historical range. This does not reconstruct emissions from activity data or emission factors; the uploaded estimates must already have been recalculated externally.

The base-year option extends the historical adjustment back to the exercise's first year. A partially adjusted historical basis cannot pass review. Original source observations remain unchanged. The before/after preview and exports expose actual output values, missing years, method parameters and justification.

## Persistence, lineage and recovery

`frontend/src/lib/inventory-workspace.ts` contains validation, persistence contracts and deterministic calculations. UI components live in `frontend/src/components/inventory/` and the page manages the exercise lifecycle.

Storage uses `ndc-inventory-exercises-v1:<countryCode>` with schema and hierarchy validation. Exercise sources, assignments, entry decisions, notes, thresholds, recalculation settings, focal points, reviewer and local change history are stored together. The data is not synchronized across devices or scoped to a remote identity. Invalid stored records are not overwritten. Storage failures retain edits in memory, warn before browser unload and offer backup export. A changed storage snapshot from another tab blocks writes until the user exports and reloads.

Source, assignment, entry-decision, reporting-period or threshold changes invalidate calculation approval and sign-off readiness. Method/justification edits require reapplication; notes, focal points and reviewer edits clear the sign-off acknowledgement. Navigation does not invalidate approvals.

JSON backups can be restored on the exercise landing page. Restoration validates country/schema/hierarchy and observations, creates new exercise IDs, and preserves existing exercises. CSV exports escape spreadsheet formulas. The sign-off package includes original observations, computed category outputs, formulas, methodology, decisions, notes and local history. History is an editable local record, not a signed audit trail.
