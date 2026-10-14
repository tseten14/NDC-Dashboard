/** Exercises slow-network independence, filter history and keyboard target selection in a real browser. */
import { expect, test } from "@playwright/test";
import { seedUgandaSession } from "./helpers";

test("sector selection, reload and Back restore the matching target", async ({ page }) => {
  const crashes: string[] = [];
  page.on("pageerror", (error) => crashes.push(error.message));
  await seedUgandaSession(page, "Admin");
  await page.goto("/dashboard?sector=afolu&target=t1");
  await expect(page.getByRole("button", { name: /^Select target t1:/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("combobox", { name: "Select sector" }).click();
  await page.getByRole("option", { name: /^Energy/ }).click();
  await expect(page).toHaveURL(/\/dashboard\?sector=energy$/);
  await expect(page.getByRole("button", { name: /^Select target t1:/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Select sector" })).toContainText("Energy");
  const target = page.getByRole("button", { name: /^Select target t3:/ });
  await target.focus();
  await page.keyboard.press("Enter");
  await expect(target).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/target=t3/);
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard\?sector=energy$/);
  await expect(page.getByRole("button", { name: /^Select target t3:/ })).toHaveAttribute("aria-pressed", "false");
  await page.goBack();
  await expect(page.getByRole("button", { name: /^Select target t1:/ })).toHaveAttribute("aria-pressed", "true");
  expect(crashes).toEqual([]);
});

test("indicator evidence loads while Climate TRACE is still pending", async ({ page }) => {
  await seedUgandaSession(page, "Admin");
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  let completed = false;
  await page.route("**/api/v1/emissions/dashboard**", async (route) => {
    await blocked;
    completed = true;
    await route.fulfill({ status: 503, json: { error: "test_slow_upstream" } });
  });
  try {
    const indicator = page.waitForResponse((r) => r.url().includes("/indicators/panel") && r.status() === 200, { timeout: 10_000 });
    await page.goto("/dashboard?sector=afolu&target=t9");
    const response = await indicator;
    expect(new URL(response.url()).searchParams.get("to")).toBe("2025");
    await expect(page.getByText("Latest measured", { exact: false }).first()).toBeVisible();
    await expect(page.locator(".recharts-bar-rectangle").first()).toBeVisible();
    expect(completed).toBe(false);
    await expect(page.getByRole("button", { name: /^Select target t9:/ })).toHaveAttribute("aria-pressed", "true");
    const animations = await page.evaluate(() => document.getAnimations().filter((a) => a.effect?.getTiming().iterations === Infinity).length);
    expect(animations).toBe(0);
    await page.screenshot({ path: "test-results/dashboard-independent-indicators.png", fullPage: true });
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("all eleven dashboard targets are selectable, including the national target", async ({ page }) => {
  await seedUgandaSession(page, "Admin");
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: /^Select target t\d+:/ })).toHaveCount(11);
  const national = page.getByRole("button", { name: /^Select target t0:/ });
  await national.focus();
  await page.keyboard.press("Enter");
  await expect(national).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/target=t0/);
});

test("the phone tools menu includes a working theme control", async ({ page }) => {
  await seedUgandaSession(page, "Admin");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Open all tools" }).click();
  const toggle = page.getByRole("dialog").getByRole("button", { name: "Switch to dark mode" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
