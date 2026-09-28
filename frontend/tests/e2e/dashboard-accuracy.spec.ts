/**
 * Verifies Dashboard Accuracy behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { test, expect } from "@playwright/test";

// Live API checks run against the production build with USE_MOCK_DATA=false.
test("dashboard displays the actual all-sector API total and isolates district figures", async ({ page, request }) => {
  expect((await (await request.get("/api/v1/health")).json()).mock_mode).toBe(false);
  await page.goto("/");
  await page.getByRole("button", { name: /^Uganda Full cockpit available/ }).click();
  const response = page.waitForResponse((r) => r.url().includes("/emissions/dashboard") && r.status() === 200);
  await page.goto("/dashboard?sector=economy-wide&target=t0");
  const d = await (await response).json();
  const latest = d.total_timeseries.at(-1);
  expect(latest.value).toBe(d.total_co2e_mtco2e);
  // The value printed beside the observed chart must be the all-sector total,
  // not the smaller NDC-sector subset or a bundled sample value.
  const latestLabel = page.getByText(`Latest measured (${latest.year}):`, { exact: false }).first();
  await expect(latestLabel).toContainText(latest.value.toFixed(1));
  await expect(page.getByText("Uganda GHG National Inventory", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "District", exact: true }).click();
  await expect(page.getByText("District progress is not scored against national NDC targets.", { exact: false })).toBeVisible();
  await expect(page.getByText("National-level indicator — district selection has no effect.", { exact: false })).toHaveCount(0);
  await page.screenshot({ path: "test-results/dashboard-district-accuracy.png", fullPage: true });
});

test("an unavailable dashboard cannot display fabricated economy-wide history or progress", async ({ page }) => {
  await page.route("**/api/v1/emissions/dashboard**", (route) => route.fulfill({ status: 503, json: { error: "upstream_unavailable" } }));
  await page.goto("/");
  await page.getByRole("button", { name: /^Uganda Full cockpit available/ }).click();
  await page.goto("/dashboard?sector=economy-wide&target=t0");
  await expect(page.getByText("Climate TRACE API unavailable", { exact: false })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("No data reported for this period", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Latest measured", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Uganda GHG National Inventory", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/dashboard-api-unavailable.png", fullPage: true });
});
