# Use the NDC Data Explorer with Qlik Cloud

This guide imports two tables into a Qlik Cloud analytics app:

| Table | Source | What it represents |
| --- | --- | --- |
| Observed emissions | Live Climate TRACE API through this app | Annual Uganda national emissions by app sector, in MtCO2e |
| NDC targets | Targets transcribed in this app from Uganda's Updated NDC (2022) | Eleven commitments, including five sector emissions targets and other indicators |

The NDC values **do not come from Climate TRACE**. Climate TRACE measures observed emissions; Uganda's NDC states the commitments. These sources use different methods and sector boundaries. A chart that places them together is context, not an official compliance determination.

## Before you start

1. Sign in to your organization's **Qlik Cloud** tenant. You need permission to create an analytics app and a REST data connection.
2. Find the public HTTPS address of the NDC Data Explorer, such as `https://YOUR-APP-DOMAIN`. Do not use the local development address.
3. Open these links in a browser. Each should show or download CSV text beginning with the indicated header:

   - `https://YOUR-APP-DOMAIN/api/v1/qlik/targets.csv` — begins with `ndc_country,target_id,...`.
   - `https://YOUR-APP-DOMAIN/api/v1/qlik/emissions.csv` — begins with `observed_country,gadm_id,...`.

The targets endpoint works without Climate TRACE. The emissions endpoint calls the app's live national dashboard service. If it returns a JSON error, resolve that error before setting up a Qlik reload. It intentionally returns HTTP 503 when the app runs with illustrative mock data.

## Create and load the Qlik app

1. In the Qlik Cloud **Analytics** activity center, select **Create** > **Analytics application**. Name it **Uganda NDC and Climate TRACE**.
2. Open the app's **Data load editor** and create a **REST** connection for the emissions URL above. Set **Method** to `GET`, authentication to **Anonymous**, response type to **CSV** (or auto detect), and pagination to **None**. Test and save the connection.
3. Select the new connection, select the CSV source/table and all columns, and insert Qlik's generated load script. Save and run **Load data**.
4. Repeat with a second REST connection for the targets URL. Load all columns into a table named `NdcTargets`; name the first table `ObservedEmissions` if Qlik asks for a table name.
5. Check the loaded data: `NdcTargets` should have **11 rows**. `ObservedEmissions` should have one row per sector and available inventory year; as of the current 2015–2025 range, that is **66 rows** (six sectors × eleven years). The end year advances as Climate TRACE's available inventory range advances. Missing observations remain empty, never zero.

If your Qlik tenant does not allow REST connections, download the two CSVs from those URLs and upload them as datasets in the Analytics activity center. This allows an initial dashboard, but refreshes then require uploading new emissions data. The repository also contains the [NDC target CSV](../data/exports/uganda-ndc-targets-2022.csv) for an offline first import.

Qlik may infer text for numeric columns in a CSV. Check that `year`, `emissions_mtco2e`, `baseline_year`, `baseline_value`, `target_year`, and `target_value` are usable as numbers before making measures. Keep `target_id`, sector keys, units, and source fields as text.

## Build the first sheets

- **Emissions by year:** line chart with `year` as the dimension and `Sum(emissions_mtco2e)` as the measure. Filter to `inventory_status = available`. Select a sector before interpreting a single line; otherwise the chart is a total of the six app sectors, which is not necessarily identical to Climate TRACE's all-sector national total.
- **Sector trend:** line chart with `year` and `climate_trace_sector_key` as dimensions and `Sum(emissions_mtco2e)` as the measure.
- **NDC commitments:** table with `ndc_sector`, `target_text`, `baseline_year`, `baseline_value`, `target_year`, `target_value`, `target_unit`, and `conditionality`. Include `target_source` and `source_url` for provenance.

The tables share only `climate_trace_sector_key`, which links the five emissions targets to the corresponding observed sector. The economy-wide target and non-emissions indicators deliberately have no Climate TRACE sector link. Avoid joining on country, year, or similarly named fields: those would duplicate values or imply false comparisons. `scope_note` explains the Climate TRACE sector boundary for each observed row. NDC AFOLU includes agriculture, while the app tracks Climate TRACE agriculture separately; do not treat AFOLU rows alone as a complete NDC AFOLU measurement.

## Keep emissions current

In the Qlik app, run **Reload** to fetch the current emissions CSV. Once the first reload succeeds, use the app's **Reload** > **Schedule** option if your tenant permits it. A daily reload is sufficient for this dataset. Check reload history after scheduling; Qlik does not update the app merely because the public endpoint changes.

The target table is a versioned reference extract. The app build regenerates it from the NDC targets currently displayed by the app. When target definitions change, deploy the updated app and reload Qlik.

## Data cautions

- `emissions_mtco2e` is Climate TRACE `co2e_100yr` in million tonnes. A negative number can represent net removals; retain the sign.
- Blank emissions mean no observation for that sector and year. `inventory_status` and `data_stale` make missing or stale results visible.
- The NDC's 2030 emissions figures are **BAU-relative targets**, not straight-line reductions from 2015. A 2030 cap can exceed the 2015 baseline and still be a reduction relative to 2030 business as usual.
- The separate [source-record CSV](../data/exports/climate-trace-uganda-sources-2021-2025.csv) is useful for source-level exploration. Its rows are not a complete territorial national inventory and should not be summed as the NDC total.

Official references: [Qlik REST connection](https://help.qlik.com/en-US/cloud-services/Subsystems/REST_Connector_help/Content/Connectors_REST/Create-REST-connection/Create-REST-connection.htm), [loading REST data](https://help.qlik.com/en-US/cloud-services/Subsystems/REST_Connector_help/Content/Connectors_REST/Load-REST-data/Load-data.htm), [Qlik app creation](https://help.qlik.com/en-US/cloud-services/Scripting/Apps/create-app-cloud-hub.htm), [Qlik reloads](https://help.qlik.com/en-US/cloud-services/Subsystems/Hub/Content/Sense_Hub/Apps/reloading-apps-cloud-hub.htm), and [Uganda's Updated NDC](https://unfccc.int/sites/default/files/NDC/2022-09/Updated%20NDC%20_Uganda_2022%20Final.pdf).
