import type { Page } from "@playwright/test";

/** Wait until the proxied API responds (dev:all must be running). */
export async function waitForApi(page: Page) {
  for (let i = 0; i < 60; i++) {
    const res = await page.request.get("/api/health");
    if (res.ok()) return;
    await page.waitForTimeout(1000);
  }
  throw new Error("API did not become ready at /api/health");
}

/** Seed session so CountryGate passes without visiting /select-country. */
export async function seedUgandaSession(page: Page, role = "SeniorDecisionMaker") {
  await page.addInitScript(
    ({ countryKey, activeRole }) => {
      sessionStorage.setItem("ndc-selected-country", countryKey);
      localStorage.setItem("uganda-ndc-active-role", activeRole);
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
    },
    { countryKey: "UG", activeRole: role },
  );
}
