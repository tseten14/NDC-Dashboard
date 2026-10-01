# Uganda emissions CSVs for 2021

The two CSVs in this folder are the files to submit together:

- `uganda_government_synthetic_2021.csv` — **synthetic** Uganda reporting for the NDC Project. It is not an official government inventory.
- `climate-trace-uganda-sources-2021-with-district.csv` — Climate TRACE's 2021 Uganda source records from the supplied API extract, with a district label added. All original API field values are unchanged.

Both CSVs have the same 25 columns in the same order: `country`, **`district`**, then the remaining 23 columns of the supplied Climate TRACE export. Both retain `year=2021`, `gas=co2e_100yr`, and `emissions_tco2e`/`emissions_mtco2e` units. Match retained source records by `source_id`, `year`, and `gas`. The Climate TRACE file has 3,864 rows; the synthetic Uganda file has 3,873 rows. The synthetic file includes 11 clearly named fictional point facilities and omits two reference point facilities. Its estimates vary by source and contain no deliberately invalid decimal, classification, or unit-label values. The synthetic file leaves API version and endpoint blank because there is no government API behind it. The Climate TRACE file retains the supplied `v7` API metadata and timestamp.

**District method and limit:** The supplied Climate TRACE API extract has no district column. `source_name` sometimes names a county, but it can also name a plant, airport, municipality, or Lake Albert. The `district` column in *both* files comes from a coordinate lookup against `backend/services/translator/uganda-districts.geojson` (Uganda ADM2). All coordinates resolved to one named district, and the two CSVs agree on the district for every matching `source_id`. For a `gadm-aggregation` area record, the label is the district containing its reported centroid; it does not allocate that area's full emissions among districts. Interpret district totals with that limitation. The district boundary source is part of this repository and is not a new Climate TRACE API field.

The supplied source file is `/Users/sherpster/Downloads/climate-trace-uganda-sources-2021-2025(in).csv`; it remains unchanged. Its 2021 rows identify `https://api.climatetrace.org/v7/sources` and extraction time `2026-09-25T14:48:04Z`. The new Climate TRACE CSV is derived from that supplied API export; it was not fetched again from the live API. To regenerate both files from the repository root:

```sh
python3 scripts/enrich_climate_trace_uganda_districts.py '/Users/sherpster/Downloads/climate-trace-uganda-sources-2021-2025(in).csv'
python3 data/synthetic/uganda-government-2021/generate_synthetic.py '/Users/sherpster/Downloads/climate-trace-uganda-sources-2021-2025(in).csv'
```

The synthetic generator uses fixed random seed `20211001` and checks its schema, identifiers, year, district locations, emissions units, activity/factor consistency, and coverage. Its illustrative 125% emissions target uses 2021 non-land-use `co2e_100yr` observations in tonnes only; it is not a territorial inventory total. The Climate TRACE enrichment script checks that it has copied the original 2021 API values exactly and added only `district`.
