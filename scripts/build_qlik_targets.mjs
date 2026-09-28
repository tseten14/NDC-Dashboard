/** Export the NDC commitments shown by the app as a flat Qlik-ready CSV. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "frontend/src/data/uganda-ndc-data.ts");
const outputPath = path.join(root, "data/exports/uganda-ndc-targets-2022.csv");
const source = ts.createSourceFile(sourcePath, fs.readFileSync(sourcePath, "utf8"), ts.ScriptTarget.Latest, true);

const declaration = source.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => [...statement.declarationList.declarations])
  .find((item) => ts.isIdentifier(item.name) && item.name.text === "ndcTargets");
if (!declaration || !declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
  throw new Error("Could not find the application's ndcTargets array");
}

function literal(node) {
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return -Number(node.operand.text);
  }
  throw new Error(`Unsupported NDC target value: ${node.getText(source)}`);
}

const targets = declaration.initializer.elements.map((element) => {
  if (!ts.isObjectLiteralExpression(element)) throw new Error("NDC target must be an object");
  return Object.fromEntries(element.properties.map((property) => {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
      throw new Error("NDC target must have named literal fields");
    }
    return [property.name.text, literal(property.initializer)];
  }));
});

const fields = [
  "ndc_country", "target_id", "ndc_sector", "climate_trace_sector_key", "metric_type",
  "baseline_year", "baseline_value", "target_year", "target_value", "target_unit",
  "conditionality", "target_text", "target_scope", "target_source", "source_url",
];
const traceTargetIds = new Set(["t1", "t4", "t5", "t6", "t7"]);
const sourceUrl = "https://unfccc.int/sites/default/files/NDC/2022-09/Updated%20NDC%20_Uganda_2022%20Final.pdf";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

const rows = targets.map((target) => {
  const row = {
    ndc_country: "UGA",
    target_id: target.id,
    ndc_sector: target.sectorId,
    climate_trace_sector_key: traceTargetIds.has(target.id) ? target.sectorId : "",
    metric_type: target.metricType,
    baseline_year: target.baselineYear,
    baseline_value: target.baselineValue,
    target_year: target.targetYear,
    target_value: target.targetValue,
    target_unit: target.unit,
    conditionality: target.conditionality,
    target_text: target.targetText,
    target_scope: "national",
    target_source: "Uganda Updated NDC (September 2022)",
    source_url: sourceUrl,
  };
  return fields.map((field) => csvCell(row[field])).join(",");
});

if (targets.length !== 11 || new Set(targets.map((target) => target.id)).size !== targets.length) {
  throw new Error("Unexpected NDC target count or duplicate target IDs");
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${fields.join(",")}\r\n${rows.join("\r\n")}\r\n`);
console.log(`Wrote ${targets.length} NDC targets to ${outputPath}`);
