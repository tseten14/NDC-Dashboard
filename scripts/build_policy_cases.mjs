#!/usr/bin/env node
/**
 * Validate data/policy-cases corpus against Zod schema.
 * Optional: extract raw text from KCI PDFs via ingest scan.
 *
 * Usage:
 *   node scripts/build_policy_cases.mjs                    # validate corpus
 *   node scripts/build_policy_cases.mjs --scan path/to.pdf # PDF text extract
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { policyCaseSchema, policyCaseIndexSchema } from "../shared/schemas/policyImpact.schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CASES_DIR = join(ROOT, "data/policy-cases");

function validateCorpus() {
  const indexPath = join(CASES_DIR, "index.json");
  const index = policyCaseIndexSchema.parse(JSON.parse(readFileSync(indexPath, "utf8")));

  const errors = [];
  for (const entry of index.cases) {
    const filePath = join(CASES_DIR, `${entry.id}.json`);
    if (!existsSync(filePath)) {
      errors.push(`Missing file: ${entry.id}.json`);
      continue;
    }
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8"));
      policyCaseSchema.parse(raw);
      if (raw.id !== entry.id) {
        errors.push(`ID mismatch: ${entry.id} vs ${raw.id}`);
      }
    } catch (e) {
      errors.push(`${entry.id}: ${e.message}`);
    }
  }

  if (errors.length) {
    console.error("Validation failed:\n", errors.join("\n"));
    process.exit(1);
  }

  console.log(`Validated ${index.cases.length} policy cases in ${CASES_DIR}`);
}

function scanPdf(pdfPath) {
  const abs = resolve(pdfPath);
  if (!existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const ingestScript = join(ROOT, "scripts/ingest_analyze.py");
  const result = spawnSync("python3", [ingestScript, abs], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    console.warn("Python ingest unavailable.");
    console.log(`
PDF scan requires Python ingest pipeline.
Install: npm run setup:ingest-python
Then re-run: node scripts/build_policy_cases.mjs --scan ${abs}

For MVP, hand-author case JSON in data/policy-cases/ following kci-brazil-ag-credit.json.
KCI: https://unfccc.int/constituted-bodies/KCI
`);
    process.exit(result.status || 1);
  }

  console.log(result.stdout);
}

function printReviewChecklist() {
  const indexPath = join(CASES_DIR, "index.json");
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  console.log("\nColleague validation checklist (sign off before merge):\n");
  for (const entry of index.cases) {
    const raw = JSON.parse(readFileSync(join(CASES_DIR, `${entry.id}.json`), "utf8"));
    const genderOutcomes = (raw.outcomes ?? []).filter((o) =>
      ["gender", "equity", "inequality"].includes(String(o.category)),
    );
    console.log(`  [ ] ${entry.id}`);
    console.log(`      Title: ${entry.title}`);
    console.log(`      Sources: ${(raw.sources ?? []).map((s) => s.section ?? s.title).join("; ")}`);
    console.log(`      Gender/equity nodes: ${genderOutcomes.length}`);
    console.log(`      Reviewer: __________  Date: __________\n`);
  }
  console.log("Run: npm run build:policy-cases — must pass before merging corpus changes.\n");
}

const args = process.argv.slice(2);
if (args[0] === "--scan" && args[1]) {
  scanPdf(args[1]);
} else if (args.includes("--review")) {
  validateCorpus();
  printReviewChecklist();
} else {
  validateCorpus();
}
