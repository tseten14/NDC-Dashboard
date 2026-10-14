# Full Uganda NDC and emissions comparison in Qlik

Upload these two CSVs into the same Qlik analytics app:

| File | Contents |
| --- | --- |
| `uganda-ndc-requirements-qlik.csv` | 262 records: 245 official requirements and framework records, plus 17 retained dashboard or BAU references. Includes all 13 adaptation tables, 48 priority actions and 82 source indicator groups. |
| `uganda-ndc-emissions-comparison-qlik.csv` | 70 summaries: seven comparison groups, five years, and two datasets, calculated from the current source files. |

The catalogue separates indicators, emissions ceilings, reduction potentials, scenario assumptions, longer-term milestones, financing, implementation actions, strategic pillars and accounting. These are different kinds of records, so 245 is an export record count, not an official count of unique NDC pledges. One source indicator with two measures can have multiple rows. The 82 adaptation indicator groups expand to 83 atomic indicator rows plus one education gender-share row.

Use `is_official_requirement = 1` for official-document views. Set it to zero to inspect retained dashboard references. `official_record_type` identifies the record type; `priority_action_id` and `source_indicator_id` preserve the adaptation hierarchy. The original website IDs remain on matched records.

## Load the files

1. Add both CSVs as data files in your Qlik app or space.
2. In the Data load editor, insert the file paths Qlik generates for those uploads. The paths below use the common `lib://DataFiles/` connection; replace the connection prefix if your space uses another one.
3. Load the tables using the script below. Their only shared column is `comparison_key`. Keep this association rather than joining every emissions record to every requirement.

```qlik
SET DecimalSep='.';
SET ThousandSep=',';

NdcRequirements:
LOAD *
FROM [lib://DataFiles/uganda-ndc-requirements-qlik.csv]
(txt, utf8, embedded labels, delimiter is ',', msq);

EmissionsComparison:
LOAD *
FROM [lib://DataFiles/uganda-ndc-emissions-comparison-qlik.csv]
(txt, utf8, embedded labels, delimiter is ',', msq);
```

Expected loaded rows: 262 and 70. The two tables should have exactly one association, `comparison_key`, and no Qlik synthetic key. Do not load the raw source files into this same model without explicitly controlling their associations. The comparison CSV already contains their totals. Qlik's `msq` setting preserves quoted multiline descriptions.

## Requirement explorer

Create filters for `ndc_component`, `sector_name`, `official_record_type` and `is_official_requirement`. Use a table with:

- `requirement_name`, `priority_action`, `ndc_indicator`
- `baseline_year`, `baseline_value`, `baseline_text`
- `target_2025_value`, `target_2025_status`, `target_2025_text`
- `target_2030_value`, `target_2030_status`, `target_2030_text`
- `target_unit`, `target_year`, `target_value`, `other_milestones`
- `abatement_potential_2030_mtco2e`, where relevant
- `source_pdf_page`, `source_section`, `source_table`, `notes`

Numeric blanks are not zeros. `TBD`, estimated values, compound baselines and ambiguous source figures remain visible in text or status columns. For example, the mountain restoration target is printed as `10,0000` and its numeric field remains blank pending clarification. Baseline years are only populated when the NDC specifies them. Milestones for 2026, 2040, 2050 or 2060 retain their original years.

## Compare the two emissions files with an NDC ceiling

Select exactly one `comparison_key`, for example `UGA|transport`, and select the full NDC emissions-ceiling record in the requirement table. Create a combo or line chart with `comparison_year` as its dimension and these measures:

```qlik
// Climate TRACE-based comparison file (MtCO2e)
Only({<comparison_dataset={'Climate TRACE-based comparison'}>}
     comparison_emissions_mtco2e)

// Synthetic Uganda demonstration (MtCO2e)
Only({<comparison_dataset={'Synthetic Uganda government demonstration'}>}
     comparison_emissions_mtco2e)

// Full-implementation NDC 2030 ceiling (MtCO2e)
Only({<is_official_requirement={1},
       official_record_type={'emissions_ceiling'},
       implementation_scenario={'Full NDC'}>}
     target_2030_value)
```

Label the third series **2030 NDC ceiling: future reference**. It is a constant future benchmark across the displayed years, not an annual target pathway. `Only()` deliberately returns blank when more than one value remains; select one comparison group before interpreting the chart. Add `comparison_data_status` and `comparison_scope_note` to a companion table.

The two input files currently contain 19,320 Climate TRACE-based records and 19,365 synthetic records. Totals use `emissions_tco2e`, divided by 1,000,000, preserving negative removals. Repeated national allocation quantities and weights in the synthetic input are not summed. The original input files are unchanged.

The Climate TRACE file's 2021 rows identify API version `v7`; its 2022–2025 rows explicitly identify `synthetic-from-2021`. Label those later years as derived demonstration data, not observed Climate TRACE inventory years. The government comparison is synthetic demonstration data for every year and is not an official Uganda inventory.

## What the emissions comparison can support

| Comparison group | Mapping and limitation |
| --- | --- |
| Economy-wide | Sum of the records available in the files. It is not verified as a complete national inventory. |
| AFOLU | Agriculture plus forestry and land use, including removals. Full national land and inventory boundaries are not reconciled. |
| Energy | Power, buildings and fossil fuel operations where present. Manufacturing fuel combustion is not separately allocated, so stationary-energy coverage is incomplete. |
| Transport | Transportation records include international aviation; territorial and bunker boundaries are not reconciled. |
| Waste | Available solid waste and wastewater records; national completeness is not established. |
| IPPU | Manufacturing and fluorinated gases where present. Manufacturing can mix process and fuel emissions, so this is a proxy. |
| Agriculture | Agriculture-only context. There is no separate official agriculture emissions ceiling; agriculture contributes to AFOLU. |

National, AFOLU and agriculture views overlap. Never sum the seven comparison groups together. Within each year and dataset, AFOLU + energy + transport + waste + IPPU reconciles to the available-file national total.

The emissions files do not supply observed forest cover, wetland area, farmer adoption, electricity access, health, education, tourism, finance or gender indicators. They also cannot directly measure achieved intervention abatement without a counterfactual. The catalogue's `comparison_use`, `comparison_limit` and `additional_data_needed` fields make these limits explicit. `ndc_inventory_scope_equivalence_verified` is zero throughout; a source-file total below a future national ceiling does not establish NDC compliance or that Uganda is on track.

Sources: [Uganda Updated NDC, September 2022](https://unfccc.int/sites/default/files/NDC/2022-09/Updated%20NDC%20_Uganda_2022%20Final.pdf), [Qlik LOAD syntax](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Scripting/ScriptRegularStatements/Load.htm), [Qlik table associations and synthetic keys](https://help.qlik.com/en-us/cloud-services/Subsystems/Hub/Content/Sense_Hub/Scripting/synthetic-keys.htm).
