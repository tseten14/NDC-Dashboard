/** Flat national inventory rows for Qlik Cloud's REST connector. */
const COLUMNS = [
  "observed_country", "gadm_id", "geography", "year", "climate_trace_sector_key",
  "emissions_mtco2e", "emissions_unit", "gas", "inventory_status", "data_stale",
  "emissions_source", "scope_note", "retrieved_at_utc",
];

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function formatQlikEmissionsCsv(dashboard, retrievedAt = new Date().toISOString()) {
  const series = dashboard?.timeseries;
  if (!series || typeof series !== "object" || dashboard.geography !== "national") {
    throw new Error("A national dashboard response is required for the Qlik export");
  }

  const rows = Object.entries(series).flatMap(([sector, points]) => {
    if (!Array.isArray(points)) throw new Error(`Missing timeseries for sector ${sector}`);
    return points.map((point) => {
      const value = point.value;
      if (!Number.isInteger(point.year) || (value != null && !Number.isFinite(value))) {
        throw new Error(`Invalid observation for sector ${sector}`);
      }
      const row = {
        observed_country: "UGA",
        gadm_id: dashboard.gadm_id,
        geography: dashboard.geography,
        year: point.year,
        climate_trace_sector_key: sector,
        emissions_mtco2e: value,
        emissions_unit: "MtCO2e",
        gas: dashboard.gas,
        inventory_status: value == null ? "missing" : "available",
        data_stale: Boolean(dashboard.data_stale),
        emissions_source: "Climate TRACE API v7",
        scope_note: dashboard.coverage?.sector_scope_notes?.[sector] ?? "",
        retrieved_at_utc: retrievedAt,
      };
      return COLUMNS.map((column) => csvCell(row[column])).join(",");
    });
  });
  return `${COLUMNS.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}
