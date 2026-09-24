# Scenario Analysis

Route: `/scenario-analysis`, a separate lazy-loaded tab immediately after Sector Classification. It is included in desktop shortcuts, the mobile tools sheet and the shared home tool catalog. Existing role visibility applies. It does not trigger the national dashboard's emissions requests.

## Workflow

- **Start:** create a scenario from a reviewed inventory category/reporting area, resume a saved scenario, restore a JSON backup, or explore a synthetic livestock sample. A completed category in the inventory review links directly to scenario setup.
- **Actions:** search and filter planning templates, sort by effect/cost/name, define custom actions and record reduction evidence/assumptions. Apply actions to the selected reporting area or explicitly choose inventory entries. Different inventory categories are visible but cannot be selected in the current scenario.
- **Timing:** set sector-wide or entry-specific start years, apply a common year, stagger by one year, and choose immediate or gradual uptake. Timelines and effects respond to these settings. Staggering is disabled when it cannot fit within the horizon.
- **Policy check:** query the existing Climate Policy Radar passage-search API, link passages, add manual national/subnational references, record stances and confirm relevance. Flag barriers/gaps and decide whether to include an action, include it conditionally or exclude it. Missing evidence is never interpreted as legal permission. Recorded restrictions require a conditional assumption or exclusion with a note.
- **Result:** compare BAU, the action scenario and an optional target benchmark. Inspect endpoint reductions, cumulative savings, remaining target gap and average abatement cost. Review contributions, assumptions and history; export annual CSV, SVG chart or full JSON. A result can be saved after required assumptions and policy checks are complete. Drafts save throughout the workflow.

## Inventory linkage

A category must pass the existing inventory review (source assignments, applied calculation, complete outputs, focal point). That is **reviewed locally**, not a claim of external sign-off.

Each scenario pins the latest-year emissions for its chosen category and reporting area, retaining entry IDs/names, assigned source/version, unit, measurement basis, calculation method and justification. Whole-source assignments include only that source's entries; entry mixes use each explicit decision and omit excluded entries. Missing observations, unreviewed categories, a zero baseline and negative removal estimates prevent scenario creation. This percentage-reduction model is for positive emissions; modelling removals needs a separate accounting model.

Scenarios do not mutate inventories. On reopening, a material change to the available inventory basis is flagged; changing that basis creates a new scenario. Mere navigation timestamps do not trigger the warning. Multiple categories/areas are modelled as separate scenarios so incompatible units and source boundaries are not silently combined.

## Inputs and numerical method

Planning templates are **not** sourced reduction factors or a verified national action catalogue. Outside the sample, effects and costs start blank. Analysts must supply a reduction estimate and its evidence or explicit assumption. No mitigation recommendations are attributed to Climate TRACE.

For each entry and year:

1. `BAU = pinned emissions × (1 + annual growth / 100)^(year − base year)`.
2. An action has zero uptake before its start. Immediate uptake is 1 from the start; gradual uptake is `min(1, (year − start + 1) / ramp years)`.
3. `action fraction = reduction % / 100 × uptake`.
4. Combined remaining emissions are `BAU × product(1 − action fraction)` over applicable included actions. Policy-excluded actions contribute zero.
5. Combined avoided emissions are allocated to actions in proportion to their standalone fractions at each entry/year. Contributions sum to the combined saving and are independent of action ordering.

The multiplicative model caps reductions at BAU and avoids summing overlapping standalone totals. It assumes independent effects; the analyst still needs to resolve measures acting on the same mechanism. Conditional actions remain included as documented hypothetical assumptions, not as findings of legal feasibility. Incomplete actions are omitted from the preview and listed as open items; saving the final result is blocked until they are resolved.

Cumulative saving sums annual avoided emissions from the year after the inventory basis through the horizon. Costs are user-entered currency per **avoided inventory unit**, allocated to combined savings; no tonne conversion is inferred. A Gg basis therefore uses cost/Gg. Unknown costs remain unknown, and average cost is unavailable if any contributing cost is missing. Negative costs may represent savings. Capital schedules, discounting, uncertainty intervals and automatic currency conversion are not included.

The optional target is an analyst-entered absolute endpoint benchmark in the same unit and scope. A source or allocation rationale is required before saving. The horizontal target line is a visual benchmark, not an official annual NDC trajectory. Default BAU growth for new scenarios is zero and still requires a rationale.

## Policy evidence

`documentsApi.searchPassages` queries `/api/v1/documents/passages/search`. The existing backend searches an indexed Uganda Climate Policy Radar export; it is not a live legal register. Results carry document links and passages, and are linked with an unconfirmed `mentions` stance. Analysts choose and confirm the actual recorded stance. Subnational references are supplied manually with HTTP/HTTPS source links. Search failures preserve existing evidence and expose retry; empty results say nothing about legality.

Sample policy records are fictional, clearly marked training evidence, and cannot be restored into a non-sample scenario. Real scenarios require source links. Classification, legal status, amendments and applicability require human review against current primary sources.

## Storage and recovery

Scenario records are schema-validated under `ndc-scenario-analysis-v1:<countryCode>`. They are local to the browser and country, independent of the inventory store. There is no remote account, scenario synchronization or submission action.

Blocked/quota-limited storage preserves in-memory edits and offers retry and backup export. Unreadable records are not overwritten. A changed storage snapshot from another tab blocks replacement. Exported scenarios may be restored as new records with new IDs, preserving existing scenarios. Restore validates geography, category, entry references, timing, evidence URLs and numerical inputs. CSV exports escape spreadsheet formulas.

Editing a scenario clears its final saved status. Action and timing edits reopen the affected policy assessment; navigation does not. JSON exports include the pinned basis, actions, assumptions, evidence, model results, open items and local change history. This history is not a signed audit trail.

## Validation

- Unit tests cover overlap accounting, allocation invariance, uptake, site starts, BAU growth, target gaps, missing inputs, policy exclusions, inventory pinning/freshness, review gates and restored-data validation.
- UI tests cover the empty starting state, unreadable storage, save recovery and concurrent-tab protection.
- `npm run test:ux -- scenario-analysis sector-classification` exercises both workflows, inventory handoff, policy API success/failure, manual references, saved scenarios, export/restore, desktop/mobile/tablet layouts and screenshots.
- `npx tsc --build --force`, `npm run lint`, `npm test`, and `npm run build`.
