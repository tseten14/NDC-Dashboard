import { test, expect } from "@playwright/test";
import { seedUgandaSession, waitForApi } from "./helpers";

test.describe("Demo smoke tests", () => {
  test.beforeEach(async ({ page }) => {
    await seedUgandaSession(page);
    await page.goto("/");
    await waitForApi(page);
  });

  test("dashboard loads after country is selected", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /NDC Targets/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/AFOLU|Transport|Energy/i).first()).toBeVisible({ timeout: 30_000 });
  });

  test("demo mode shows presenter toolbar", async ({ page }) => {
    await page.goto("/dashboard?demo=1");
    await expect(page.getByTestId("demo-presenter-toolbar")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Demo script/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Exit demo/i })).toBeVisible();
  });

  test("Start 5-minute demo from Home navigates to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Start 5-minute demo/i }).click();
    await expect(page).toHaveURL(/\/dashboard\?.*demo=1.*sector=transport/, { timeout: 30_000 });
    await expect(page.getByTestId("demo-presenter-toolbar")).toBeVisible({ timeout: 30_000 });
  });

  test("NDC gap panel on Home for Senior Decision-Maker", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("combobox", { name: /Switch active role/i })).toContainText(
      "Senior Decision-Maker",
    );
    await expect(
      page
        .getByTestId("ndc-gap-summary")
        .or(page.getByText(/NDC gap & priorities/i))
        .or(page.getByText(/gap summary cannot be calculated/i)),
    ).toBeVisible({ timeout: 90_000 });
  });

  test("Policy Impact wizard completes with forecast", async ({ page }) => {
    await page.goto("/policy-impact");
    await expect(page.getByText("Policy Impact Forecasting")).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /Next: Select intervention/i }).click();
    await expect(
      page.locator("button").filter({ hasText: /credit|reforest|renewable|pricing|efficiency|transition|grid|forest/i }).first(),
    ).toBeVisible({ timeout: 30_000 });
    await page.locator("button").filter({ hasText: /credit|reforest|renewable|pricing|efficiency|transition|grid|forest/i }).first().click();
    await page.getByRole("button", { name: /Next: Parameters/i }).click();
    await page.getByRole("button", { name: /Run forecast/i }).click();

    await expect(page.getByText(/Confidence|Trade-offs/i).first()).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Forecast failed/i)).not.toBeVisible();
  });

  test("Climate Finance MAC chart renders", async ({ page }) => {
    await page.goto("/climate-finance");
    await expect(page.getByText("Climate Finance").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Cost to cut carbon/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible({ timeout: 30_000 });
  });
});
