# Final two-file package: Uganda 2021–2025

The adjacent `uganda-government-2021-2025` folder contains exactly two final CSVs:

- `climate-trace-uganda-sources-2021-2025-with-district.csv`: unchanged weighting reference, 19,320 rows. Only 2021 retains observed Climate TRACE values; 2022–2025 are synthetic.
- `uganda_government_synthetic_2021-2025.csv`: 19,320 modeled source allocations, retaining the original 25 columns and adding seven explicit allocation/provenance columns.

This support folder retains the original government series and the earlier district/national audit tables. Its older README describes the earlier inputs and outputs; this note describes the final package.

## Allocation

For each country, year, gas, sector and subsector, split positive emissions and negative removals before aggregating. Preserve the original synthetic government national totals separately for each component. These are illustrative national emissions quantities, **not official government observations or NDC targets**.

1. Sum absolute Climate TRACE values to districts and the national total within each group.
2. Calculate `district_weight = reference_district_magnitude / reference_national_magnitude`.
3. Calculate the modeled district quantity as the signed synthetic national quantity multiplied by the district weight.
4. To retain the original source-level CSV layout, distribute that district quantity to reference sources using `source_weight_within_district = reference_source_magnitude / reference_district_magnitude`.

Thus each final government row is `national_quantity_tco2e × district_weight × source_weight_within_district`. District aggregation implements the emailed weighting formula at subsector resolution; sector totals are sums of subsector allocations. Allocating an aggregate sector total directly with sector-wide weights is a different possible allocation and must not be mixed with this subsector allocation.

The two missing reference airports are restored and the eleven fictional facilities are excluded from the final source coverage: their original values still contribute to the preserved national input totals. Both final files now have matching `(source_id, year, gas)` keys. Sources are allocation locations, not independently measured government facilities. Capacity and source metadata come from the reference; activity and capacity factor scale with modeled emissions, retaining reference factors and conventions. Zero-valued reference sources remain zero.

Government rows label `model_status=modeled`, `quantity_kind=synthetic_government_emissions_not_ndc_target`, `api_version=modeled-synthetic-ct-weighted`, and a blank API endpoint. `extracted_at_utc` is a generation-date marker for modeled rows. National quantities and district weights repeat across source rows: use one value per group/district, **do not sum these columns**. Sum `emissions_tco2e` or `emissions_mtco2e` for district or national quantities.

## Reproduction and limitations

Run `python3 scripts/finalize_uganda_weighted_series.py` to regenerate the final government CSV from the archived original synthetic national inputs and the current Climate TRACE reference. It verifies national reconciliation and all district allocations before writing. The earlier expansion script generates unweighted synthetic inputs, and the earlier district-allocation script generates additional intermediate tables; neither is the final-package command.

The reference currently has district labels for every row and weights for every nonzero input group. A zero national/reference group (iron and steel) remains zero. The generator refuses a nonzero input group with no reference weight, or an unlocated reference, rather than silently misallocating it; such inputs require explicit national-unallocated records.

This follows the allocation calculation described in the emails as a synthetic demonstration. The attached methodology notes, confirmed NDC quantities, approved sector mapping, team-agreed boundaries and UNFCCC gap thresholds have not been supplied to this workflow. The existing 135-polygon boundary set is provisional; aggregate sources use their reported centroid, without splitting boundary-crossing polygons. Complete national source coverage is not established. No Planet raster data or policy data is synthesized here.

Comparing the modeled series to its weighting reference is dependent: within each subsector/year/emissions-or-removals component, districts inherit the national ratio. These differences cannot independently establish district-specific gaps or official NDC progress.
