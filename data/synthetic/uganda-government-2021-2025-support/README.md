# Uganda 2021–2025 synthetic time-series comparison

**Status: demonstration data, 5 October 2026.** This folder contains two source-level input CSVs, four modeled allocation output CSVs, and this explanation. The Uganda file is synthetic; it is not an official government inventory, an NDC allocation, or evidence that a district has an emissions gap.

## The two CSVs

1. `climate-trace-uganda-sources-2021-2025-with-district.csv` has **19,320 observations**, with 3,864 sources in each year from 2021 through 2025. The 2021 rows retain the supplied Climate TRACE API v7 values and provenance, with district labels added. **Every 2022–2025 value is synthesized from the 2021 baseline, not retrieved from Climate TRACE.**
2. `uganda_government_synthetic_2021-2025.csv` has **19,365 illustrative observations**, with 3,873 sources in each year from 2021 through 2025. All years are synthetic government comparison data, not an official government inventory. The existing 2021 baseline is retained, including 3,862 reference source IDs, eleven explicitly fictional facilities, and two omitted reference aviation facilities. All rows use `gas=co2e_100yr`.

Both files have the same 25 columns, with `country`, `district`, then the original Climate TRACE export columns. `emissions_tco2e` is metric tonnes CO2e and `emissions_mtco2e` is million metric tonnes CO2e. Join matching observations using `(source_id, year, gas)`, not source name. The two omitted facilities are Savannah Airstrip and Kisoro Airport; the eleven invented facilities have names beginning `Synthetic` and IDs in the 98000001 series.

## How the annual series was generated

The reproducible generator is `scripts/expand_uganda_synthetic_series.py`. Run `python3 scripts/expand_uganda_synthetic_series.py` from the repository root. It reads only each file's retained 2021 rows, so rerunning does not compound prior generated years. The seed is `uganda-series-20211001-v1`; these are illustrative scenarios, not forecasts or observed national growth rates.

Annual activity changes combine sector assumptions (manufacturing +3.5%, power +2.5%, transportation +3.0%, agriculture +1.8%, waste +2.5%, buildings +2.2%, forestry and land use −1.2%), a persistent facility variation of ±2.5 percentage points, sector-year variation of ±1.5 points, district-year variation of ±1 point, and facility-year variation of ±2 points. Factors compound year by year. Related records sharing a facility name and coordinates receive the same variations. Government activity adds its own persistent variation of ±2 points and annual variation of ±1.2 points, allowing the comparison ratio to evolve.

Emissions-factor changes start at −0.4% per year with facility-year variation of ±1 point; government factors add ±0.6 points. Emissions scale by activity change multiplied by emissions-factor change. Capacity is held at its baseline, while capacity factor scales with activity, retaining the original export's conventions. Tonnes and million tonnes remain consistent. Negative removals retain their sign, zero baselines remain zero, and source IDs, districts, coordinates, classifications, unit labels, and coverage stay constant across years. This scenario does not model facility openings or closures.

Generated 2022–2025 rows use `api_version=synthetic-from-2021`, blank `api_endpoint`, and `extracted_at_utc=2026-10-05T00:00:00Z` as the generation-date marker (not an API extraction). The 25-column schema is preserved. The 2021 rows retain their original provenance fields. Filter by year before aggregating, and join the two series on `(source_id, year, gas)`; names and IDs alone are not unique annual observations.

## How the retained 2021 Uganda synthetic baseline was revised

The prior synthetic file was forced to exactly 125% of Climate TRACE's non-forestry located-source emissions. That artificial total target was removed. A fixed seed (`20211001`) supplies small ordinary variation and explicit provisional test cases:

- Ordinary variation: 0.97–1.03 times a reference source's emissions.
- Higher-estimate cases: 1.15–1.35 times reference emissions.
- Lower-estimate cases: 0.72–0.88 times reference emissions.
- Coverage cases: the two omitted aviation facilities and eleven clearly labeled added facilities.

There are 2,906 ordinary, 526 higher-estimate, 430 lower-estimate, two omitted, and eleven added source cases. The same physical facility receives one case across its related source records. Activity is adjusted with emissions, and the original units and source classifications are retained. Emissions factors are unchanged compared with the previous synthetic CSV; the source export's capacity-factor conventions are retained even where the field is not a literal physical utilization fraction.

The retained 2021 baseline keeps the same 3,873 source IDs, 25-column layout, district labels, classifications, and units as the previous version. Values changed in 3,410 rows: activity and capacity factor in 3,410, and emissions in 3,409. Its 2021 non-forestry located-source sum is **34,516,718.89 t CO2e**, compared with **32,410,401.71 t CO2e** in the 2021 Climate TRACE source extract. The resulting ratio is **1.06499**, an outcome of the synthetic cases rather than a target or national inventory total. All of these choices are provisional until the team confirms the question scenarios.

## District method and the new workbook

The `district` labels in both CSVs use the repository's 135-polygon Uganda ADM2 boundary file, identified by its SHA-256 hash `5b103a8a1ea23e424ba95c3dc0a0ae3d60919ad39e2a31e5cb755d49bc981de3`. The source points fall in 131 named districts. Point facilities were assigned by point-in-polygon. A `gadm-aggregation` record represents a county or similar area; its label is the district containing its reported centroid. That label does **not** split the county's emissions across districts if its polygon crosses a boundary.

The supplied *Climate TRACE Uganda 2025 - District Weights.xlsx* demonstrates the district-weighting method for **2025** using **58 historical GADM polygons**. Its source IDs match the 2021 extract, but its year and boundaries differ; 1,983 of the 3,864 matching records have different district names under the two boundary sets. No observed 2025 emissions value, national total, or workbook district weight was copied into these series; their 2025 values are synthesized from 2021. Before a shared Climate TRACE and Planet district package is published, the team must choose one boundary set and replace centroid assignments where counties cross current district boundaries.

## How these files fit the methodology email

The email proposes linking Climate TRACE sources to agreed districts, aggregating by sector and subsector, deriving district shares, and then distributing **separately supplied national NDC quantities**. The two original CSVs remain source-level inputs. They are not themselves engineered district NDC allocations: their independent facility variations do not obey the district-share formula. The following four output CSVs now implement a **demonstration of the emailed method**, using the synthetic government's national emissions totals rather than confirmed NDC targets:

- `uganda_modeled_district_sector_2021-2025.csv`: 3,965 district/year/sector/component rows.
- `uganda_modeled_district_subsector_2021-2025.csv`: 14,130 district/year/subsector/component rows.
- `uganda_synthetic_national_sector_allocation_2021-2025.csv`: 40 national component totals and reconciliation rows.
- `uganda_synthetic_national_subsector_allocation_2021-2025.csv`: 170 national component totals and reconciliation rows.

Run `python3 scripts/allocate_uganda_district_series.py --use-synthetic-national-totals` after generating the source series. The explicit option acknowledges that these national inputs are synthetic emissions, **not NDC quantities**. The national output tables expose these inputs alongside the allocated totals and remainders. Both aggregation levels are alternative views of the same inputs: do not add sector and subsector outputs together.

For each year, gas, and sector (or subsector), first split every source into positive emissions or negative removals; calculate weights separately using absolute magnitudes. Let `C_d` be the Climate TRACE magnitude located in district d and `C_n` the sum of located and unlocated reference magnitudes in that group. Then `district_weight = C_d / C_n` and `modeled_district_quantity = national_quantity × district_weight`, with the original emissions/removal sign restored. National quantities are independently aggregated from the synthetic government input. Unlocated reference weights retain an explicit national unallocated remainder rather than being redistributed over known districts. No reference magnitude means no usable weight, and the national quantity remains unallocated. Iron-and-steel has zero input magnitude in all five years and is explicitly marked as having no reference weight.

Outputs label every allocation `model_status=modeled`; they include the input year and gas, quantity kind, synthetic national-input status, observed/synthetic weight-input status, provisional boundary status and SHA-256, district share, signed tonnes and million tonnes, and `gap_status=not_assessed_thresholds_pending`. National reconciliation verifies allocated plus unallocated equals the input quantity. Facility allocation is deferred, as requested in the email.

These files follow the **calculation described in the emails**, with provisional implementation choices; the attached methodology notes and confirmed inputs have not been supplied here. The current source extract has no blank district assignments, but this does not demonstrate complete national source coverage. Missing source emissions cannot be quantified from this extract and are not silently assumed to be measured. The district outputs cover only district/group combinations represented in the source extract, not every district in the boundary file; absent combinations must not be treated as measured zero. County aggregates still use centroid assignment, so boundary-crossing polygons remain a spatial limitation. The existing NDC export mainly describes 2030 targets and mixed metrics, not confirmed sector quantities for each year of 2021–2025; no annual NDC target interpolation or sector mapping has been invented.

The Planet raster workflow is a separate district-statistics layer. Planet averages, carbon stocks, and changes require the agreed boundary polygons, raster dates, units, mask, pixel-area method, and Planet's methodology or a documented GIS calculation. Climate Policy Radar records are policy evidence, not emissions observations. Neither Planet nor policy values were invented in these two CSVs.

For Question 2, a district figure distributed using Climate TRACE district shares is mathematically dependent on Climate TRACE. Comparing that modeled figure back with Climate TRACE repeats the national ratio and cannot independently identify a district-specific gap. Apply UNFCCC's still-pending comparison thresholds only to comparable, independently supported quantities.

## Review checks and outstanding inputs

Checks completed on the expanded files: unique `(source_id, year, gas)` keys; 25-column schemas; all five years present with the same source coverage per year; unchanged 2021 baseline rows; finite numeric values; consistent generated tonnes and million tonnes; unchanged source metadata; preserved emissions/removal signs; and explicit synthetic provenance for generated rows. The government series has eleven added IDs and two missing IDs relative to the reference in every year.

To turn this demonstration into the first approved data package, the team still needs the agreed question scenarios, Uganda NDC figures by sector with their years and units, the approved sector mapping, one district boundary dataset, Planet delivery and method, Climate Policy Radar records, and UNFCCC's Question 2 thresholds. The files must remain labeled as **demonstration time series**: observed Climate TRACE reference values only for 2021, synthesized Climate TRACE-style values for 2022–2025, and synthetic government comparison values throughout.
