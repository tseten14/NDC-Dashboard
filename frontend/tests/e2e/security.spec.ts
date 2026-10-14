/**
 * End-to-end checks that the security hardening did not break the app, and
 * that the parts a browser is responsible for actually behave.
 *
 * Some of what was changed can only be observed in a real browser: whether the
 * content security policy blocks the app's own scripts, whether the session
 * cookie survives a page reload, whether the unlock box appears before the
 * upload controls. A server-side test cannot see any of that.
 */
import { test, expect, type ConsoleMessage } from "@playwright/test";
import { seedUgandaSession, waitForApi } from "./helpers";

/** Console noise that is expected and unrelated to security. */
const IGNORED = [
  /Download the React DevTools/i,
  /\[vite\]/i,
  /React Router Future Flag/i,
];

function collectConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe("security hardening does not break the app", () => {
  test("dashboard loads with no content-security-policy or CORS failures", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await seedUgandaSession(page);
    await waitForApi(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();

    // A blocked script or refused cross-origin request shows up here. Both were
    // real risks: the CSP was newly tightened, and CORS stopped allowing every
    // origin.
    const security = errors.filter((e) =>
      /content security policy|refused to|cors|blocked by/i.test(e),
    );
    expect(security, `security-related console errors:\n${security.join("\n")}`).toHaveLength(0);
  });

  test("public data still loads without any credentials", async ({ request }) => {
    for (const path of [
      "/api/v1/health",
      "/api/v1/emissions/summary",
      "/api/v1/documents?limit=2",
      "/api/v1/policy-cases",
    ]) {
      const res = await request.get(path);
      expect(res.status(), `${path} should stay public`).toBe(200);
    }
  });

  test("both import screens open without an operator passphrase", async ({
    page,
  }) => {
    await seedUgandaSession(page, "Admin");
    await page.goto("/ingest");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/Drop .csv, .json, .txt or .pdf here/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /unlock importing/i })).toHaveCount(0);
    await expect(page.getByLabel(/operator passphrase/i)).toHaveCount(0);
    await page.getByRole("button", { name: /Data Pipeline/i }).click();
    await expect(page.locator("#pipeline-file-input")).toBeAttached();
    await expect(page.getByLabel(/operator passphrase/i)).toHaveCount(0);
  });

  test("quick scan uploads a CSV after reload without a session or key", async ({
    page,
  }) => {
    await seedUgandaSession(page, "Admin");
    await page.goto("/ingest");
    await page.reload();
    await expect(page.getByLabel(/operator passphrase/i)).toHaveCount(0);
    await page.locator('input[type="file"]').setInputFiles({
      name: "passphrase-free-scan.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("year,value,sector\n2024,2.5,energy\n"),
    });
    const scanned = page.waitForResponse((response) => response.url().includes("/api/v1/ingest/scan") && response.request().method() === "POST");
    await page.getByRole("button", { name: /Review my files/i }).click();
    const response = await scanned;
    expect(response.status()).toBe(200);
    const report = await response.json();
    expect(report.files[0].filename).toBe("passphrase-free-scan.csv");
    expect(response.request().headers()["x-api-key"]).toBeUndefined();
    expect((await page.context().cookies()).some((cookie) => cookie.name === "ndc_ops_session")).toBe(false);

    const exposure = await page.evaluate(() => ({
      cookie: document.cookie,
      storage: JSON.stringify(window.localStorage) + JSON.stringify(window.sessionStorage),
    }));
    expect(exposure.cookie).not.toContain("ndc_ops_session");
    expect(exposure.cookie).not.toContain("dev-ingest-key-change-me");
    expect(exposure.storage).not.toContain("dev-ingest-key-change-me");
  });

  test("main screens each load without errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await seedUgandaSession(page, "Admin");

    for (const path of ["/dashboard", "/documents", "/my-work"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body"), `${path} rendered nothing`).toBeVisible();
    }

    const fatal = errors.filter((e) => /content security policy|cors|is not a function|undefined is not/i.test(e));
    expect(fatal, `console errors:\n${fatal.join("\n")}`).toHaveLength(0);
  });
});
