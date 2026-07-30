#!/usr/bin/env node
/**
 * Captures screenshots of the running app.
 *
 * Drives a real browser through the main screens and saves an image of each, for
 * demos and documentation. The app must already be running.
 */
/**
 * Capture demo deck screenshots at 1920×1080.
 * Usage: node scripts/capture_demo_screenshots.mjs [baseURL]
 * Default: https://ndc-data-explorer-e051f914.vercel.app
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "demo", "screenshots");
const baseURL = process.argv[2] ?? "https://ndc-data-explorer-e051f914.vercel.app";

const shots = [
  { file: "dashboard-transport.png", path: "/dashboard?demo=1&sector=transport", waitMs: 8000 },
  { file: "map-uganda.png", path: "/map?demo=1", waitMs: 25000 },
  { file: "ai-2030.png", path: "/ai-2030?demo=1", waitMs: 10000 },
  { file: "documents-pathway.png", path: "/documents?tab=pathway&demo=1", waitMs: 8000 },
  { file: "climate-finance.png", path: "/climate-finance?demo=1", waitMs: 10000 },
];

async function seedSession(page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("ndc-selected-country", "UG");
    localStorage.setItem("uganda-ndc-active-role", "SeniorDecisionMaker");
    localStorage.setItem(
      "uganda-ndc-available-roles",
      JSON.stringify([
        "ProjectDeveloper",
        "FieldOfficer",
        "MinistryDeliveryOfficer",
        "MRVOfficer",
        "SeniorDecisionMaker",
        "Admin",
      ]),
    );
  });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await seedSession(page);

  for (const shot of shots) {
    const url = `${baseURL.replace(/\/$/, "")}${shot.path}`;
    console.log(`Capturing ${shot.file} ← ${url}`);
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(shot.waitMs);
      await page.screenshot({
        path: path.join(outDir, shot.file),
        fullPage: false,
      });
      console.log(`  ✓ ${shot.file}`);
    } catch (err) {
      console.error(`  ✗ ${shot.file}:`, err.message);
    }
  }

  await browser.close();
  console.log(`Done. Screenshots in ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
