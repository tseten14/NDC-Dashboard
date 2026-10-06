# Final two-file package: Uganda 2021–2025

**SYNTHETIC DEMONSTRATION DATA – not official government figures.** Every government row carries `data_label=SYNTHETIC_DEMONSTRATION_NOT_OFFICIAL`; keep that label visible wherever these values are displayed, including interactive dashboard pages.

The adjacent `uganda-government-2021-2025` folder contains exactly two final CSVs:

- `climate-trace-uganda-sources-2021-2025-with-district.csv`: unchanged weighting reference, 19,320 rows (3,864 sources per year). Only 2021 retains observed Climate TRACE values; 2022–2025 are synthetic.
- `uganda_government_synthetic_2021-2025.csv`: 19,365 rows (3,873 sources per year), retaining the original 25 columns and adding eleven explicit allocation, variation, coverage and labelling columns.

This support folder retains the original government series and the earlier district/national audit tables. Its older README describes the earlier inputs and outputs; this note describes the final package.

## Allocation

For each country, year, gas, sector and subsector, split positive emissions and negative removals before aggregating. Preserve the original synthetic government national totals separately for each component. These are illustrative national emissions quantities, **not official government observations or NDC targets**.

1. Sum absolute Climate TRACE values to districts and the national total within each group.
2. Calculate `district_weight = reference_district_magnitude / reference_national_magnitude` and `source_weight_within_district = reference_source_magnitude / reference_district_magnitude`.
3. Multiply each matched source by its own `source_variation_factor`: the 2021 ratio of the original synthetic government value to the Climate TRACE value for that source. The factors range from 0.72 to 1.35 and the same factor is reused for all five years. Sources that are zero in Climate TRACE stay zero.
4. Rescale every group so it still adds up to the same national number. With `N` the national total, `S` the total of synthetic-only facilities in the group, `c` a source's Climate TRACE magnitude and `C` the group's Climate TRACE magnitude, `group_rescale_factor = (N − S) / (N × Σ(c × factor) / C)`.

Thus each matched government row is `national_quantity_tco2e × district_weight × source_weight_within_district × source_variation_factor × group_rescale_factor`, with the emissions/removals sign restored. Every subsector, year and component still sums to its national total, while districts and facilities now have their own differences from Climate TRACE: source-level ratios range from about 71% to 135%, and districts can come out above or below the national ratio. This variation is engineered for the demonstration; it is not evidence about any real district or facility.

## Coverage gap

The coverage difference is now explicit, as in the original 2021 design:

- **Synthetic only (11 facilities, `coverage_status=synthetic_only`):** facilities named `Synthetic …` with IDs 98000001–98000011, including three Synthetic Jinja food processing plants. Their values come unchanged from the original synthetic series and count towards the national totals. They are fictional and have no Climate TRACE match.
- **Climate TRACE only (2 facilities):** Kisoro Airport and Savannah Airstrip are absent from the government file in every year. Their reference share is redistributed through the group rescale.

Join the files on `(source_id, year, gas)`. A facility missing from one file is "not included", not zero emissions.

## Columns

Government rows label `model_status=modeled` (matched) or `model_status=synthetic_facility_not_in_climate_trace` (synthetic only), `quantity_kind=synthetic_government_emissions_not_ndc_target`, `api_version=modeled-synthetic-ct-weighted` or `synthetic-only-facility`, a blank API endpoint, and `data_label=SYNTHETIC_DEMONSTRATION_NOT_OFFICIAL`. `extracted_at_utc` is a generation-date marker. Weight, factor and rescale columns are blank for synthetic-only rows. National quantities, weights and rescale factors repeat across source rows: **do not sum these columns**. Sum `emissions_tco2e` or `emissions_mtco2e` for district or national quantities. Capacity and source metadata come from the reference; activity and capacity factor scale with modeled emissions, retaining reference factors and conventions.

## Reproduction and limitations

Run `python3 scripts/finalize_uganda_weighted_series.py` to regenerate the final government CSV from the archived original synthetic series and the current Climate TRACE reference. Before writing, it verifies that every group reconciles to its national total, that all factors fall between 0.72 and 1.35, that the airports are absent and the 11 synthetic facilities present in every year, that keys are unique, and that districts within a group no longer share one ratio, with some above and some below Climate TRACE. Run `python3 scripts/build_uganda_case_studies_docx.py` afterwards to rebuild the case-study document from the two CSVs.

The reference currently has district labels for every row and weights for every nonzero input group. A zero national/reference group (iron and steel) remains zero. The generator refuses a nonzero input group with no reference weight, or an unlocated reference, rather than silently misallocating it.

This follows the allocation calculation described in the emails as a synthetic demonstration, with deliberately added variation. Confirmed NDC quantities by sector and year, an approved sector mapping, team-agreed boundaries and UNFCCC gap thresholds have not been supplied to this workflow. The existing 135-polygon boundary set is provisional; aggregate sources use their reported centroid, without splitting boundary-crossing polygons. Agriculture sources such as cattle are county-level area records, not individual farms. No Planet raster data or policy data is synthesized here.
