/**
 * Export the eleven selected NDC targets for Qlik from the source-referenced
 * full catalogue. Dashboard draft wording must not overwrite verified figures.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "data/exports/uganda-ndc-requirements-qlik.csv");
const outputPath = path.join(root, "data/exports/uganda-ndc-targets.csv");
const parsed = Papa.parse(fs.readFileSync(sourcePath, "utf8"), { header: true, skipEmptyLines: true });
if (parsed.errors.length) throw new Error(`Invalid full NDC catalogue: ${parsed.errors[0].message}`);
const selectedIds = ["t0", "t1", "t2", "t9", "t4", "t3", "t5", "t6", "t7", "t8", "t10"];
const targets = selectedIds.map((id) => {
  const matches = parsed.data.filter((row) => row.requirement_id === `${id}_main`);
  if (matches.length !== 1 || matches[0].is_official_requirement !== "1") {
    throw new Error(`Expected one official primary target for ${id}`);
  }
  return matches[0];
});

const fields = [
  "ndc_country", "target_id", "ndc_sector", "climate_trace_sector_key", "metric_type",
  "baseline_year", "baseline_value", "target_year", "target_value", "target_unit",
  "conditionality", "target_text", "target_scope", "target_source", "source_url",
  "target_name", "ndc_component", "target_2025_value", "bau_2030_value",
  "reduction_below_bau_percent", "target_value_status", "baseline_year_status",
  "implementation_scenario", "source_pdf_page", "source_printed_page", "source_reference",
  "source_notes", "conditionality_note", "comparison_key", "comparison_note",
  "export_scope", "verification_date",
];
const traceTargetIds = new Set(["t1", "t4", "t5", "t6", "t7"]);
const sourceUrl = "https://unfccc.int/sites/default/files/NDC/2022-09/Updated%20NDC%20_Uganda_2022%20Final.pdf";

function csvCell(value) {
  if (typeof value === "number") return String(value);
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

const rows = targets.map((target) => {
  const number = (field) => {
    const value = target[field];
    if (value === "" || value == null) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new Error(`Non-numeric ${field} for ${target.target_id}`);
    return numeric;
  };
  if (target.source_url !== sourceUrl) throw new Error("Selected targets must use the specified UNFCCC PDF");
  const isEmissions = target.official_record_type === "emissions_ceiling";
  const row = {
    ndc_country: "UGA",
    target_id: target.target_id,
    ndc_sector: ({ t2: "afolu", t9: "afolu" })[target.target_id] ?? target.sector,
    climate_trace_sector_key: traceTargetIds.has(target.target_id) ? target.sector : "",
    metric_type: isEmissions ? "emissions-reduction" : ({ t2: "forest-cover", t9: "wetlands-coverage", t3: "electricity-capacity", t8: "sustainable-land-management-share", t10: "electricity-access" })[target.target_id],
    baseline_year: number("baseline_year"),
    baseline_value: number("baseline_value"),
    target_year: 2030,
    target_value: number("target_2030_value"),
    target_unit: target.target_unit,
    conditionality: target.conditionality,
    target_text: target.requirement_text,
    target_scope: "national",
    target_source: "Uganda Updated NDC (September 2022)",
    source_url: sourceUrl,
    target_name: target.requirement_name,
    ndc_component: target.ndc_component,
    target_2025_value: number("target_2025_value"),
    bau_2030_value: number("bau_2030_value"),
    reduction_below_bau_percent: number("reduction_below_bau_percent"),
    target_value_status: target.target_2030_status || "stated",
    baseline_year_status: target.baseline_year ? "stated" : "not_specified_in_source_table",
    implementation_scenario: target.implementation_scenario,
    source_pdf_page: number("source_pdf_page"),
    source_printed_page: number("source_printed_page"),
    source_reference: target.source_reference,
    source_notes: target.notes,
    conditionality_note: target.conditionality_basis,
    comparison_key: isEmissions ? target.comparison_key : "",
    comparison_note: isEmissions ? target.comparison_limit : "Requires an observed series for this exact indicator; emissions totals cannot measure this target.",
    export_scope: "Selected key NDC targets only; not the complete NDC. One primary indicator per row. Percentages use 0-100.",
    verification_date: target.verification_date,
  };
  return fields.map((field) => csvCell(row[field])).join(",");
});

if (targets.length !== 11 || new Set(targets.map((target) => target.target_id)).size !== targets.length) {
  throw new Error("Unexpected NDC target count or duplicate target IDs");
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${fields.join(",")}\r\n${rows.join("\r\n")}\r\n`);
console.log(`Wrote ${targets.length} NDC targets to ${outputPath}`);
