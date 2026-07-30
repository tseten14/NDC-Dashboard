/**
 * End-to-end smoke tests.
 *
 * These drive a real browser against the running app the way a person would:
 * open a page, click things, and check that the numbers and charts actually
 * appear. They are deliberately shallow — the goal is to catch "the whole screen
 * is blank" or "the API stopped answering", not to re-check every figure (the
 * unit tests in frontend/src/test do that).
 *
 * Run with: npm run test:e2e
 */
import { test, expect } from "@playwright/test";
import { waitForApi, seedUgandaSession } from "./helpers";

test.describe("NDC Data Explorer smoke", () => {
  test("landing page offers Uganda as a selectable country", async ({ page }) => {
    await page.goto("/");
    await waitForApi(page);
    // The country picker is the front door: nothing else is reachable until a
    // country is chosen, so this failing means the whole app is unreachable.
    await expect(page.getByRole("heading", { name: /NDC Data/i })).toBeVisible();
    await expect(page.getByText("Uganda", { exact: true }).first()).toBeVisible();
  });

  test("dashboard shows live sector emissions and the NDC target list", async ({ page }) => {
    await seedUgandaSession(page);
    await page.goto("/dashboard");
    await waitForApi(page);

    // The accuracy strip along the top carries the headline per-sector figures.
    await expect(page.getByText(/AFOLU/i).first()).toBeVisible();
    await expect(page.getByText(/NDC TARGETS/i).first()).toBeVisible();

    // Every sector figure is rendered in MtCO2e; if the API returned nothing the
    // strip renders empty and this assertion fails.
    await expect(page.getByText(/\bMt\b/).first()).toBeVisible();
  });

  test("selecting a target fills the observed-data and progress columns", async ({ page }) => {
    await seedUgandaSession(page);
    await page.goto("/dashboard");
    await waitForApi(page);

    // Clicking a target is what loads the chart and the progress ring — the two
    // panes stay empty until a target is chosen.
    await page.getByText(/Reduce AFOLU sector GHG emissions/i).first().click();

    await expect(page.getByText(/OBSERVED DATA/i).first()).toBeVisible();
    await expect(page.getByText(/PROGRESS/i).first()).toBeVisible();
    await expect(page.getByText(/Climate TRACE/i).first()).toBeVisible();
  });

  test("emissions map renders its totals and sector legend", async ({ page }) => {
    await seedUgandaSession(page);
    await page.goto("/map");
    await waitForApi(page);

    await expect(page.getByText(/TOTAL EMISSIONS/i).first()).toBeVisible();
    await expect(page.getByText(/TRACKED SOURCES/i).first()).toBeVisible();
    // The legend only appears once the map has data to colour by sector.
    await expect(page.getByText(/SECTORS/i).first()).toBeVisible();
  });

  test("no uncaught page errors while navigating the main screens", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await seedUgandaSession(page);
    for (const route of ["/", "/dashboard", "/map"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
    }

    expect(pageErrors, `uncaught errors: ${pageErrors.join(" | ")}`).toHaveLength(0);
  });
});
