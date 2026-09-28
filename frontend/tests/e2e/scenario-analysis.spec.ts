/**
 * Verifies Scenario Analysis behavior so regressions cannot silently change a published value, evidence boundary, or user workflow.
 *
 * Read the owning guide before changing source, unit, authentication, or availability rules.
 */
import { test, expect, type Page } from '@playwright/test';

async function openScenarioAnalysis(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Uganda Full cockpit available/ }).click();
  await page.getByRole('button', { name: 'Open all tools' }).click();
  await page
    .getByRole('navigation', { name: 'All workspace tools' })
    .getByRole('link', { name: /Scenario Analysis/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Scenario Analysis', exact: true })).toBeVisible();
}

test('scenario: production does not offer bundled sample data', async ({ page, baseURL }) => {
  test.skip(baseURL?.includes('18080') ?? false, 'The development-only fixture suite deliberately enables sample workflows.');
  await openScenarioAnalysis(page);
  await expect(page.getByRole('button', { name: 'Explore a sample scenario' })).toHaveCount(0);
  await expect(page.getByText(/sample workflow/i)).toHaveCount(0);
});

test('scenario: creates from a reviewed archived inventory and keeps its snapshot', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Uganda Full cockpit available/ }).click();
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem('ndc-inventory-exercises-v1:UG', JSON.stringify([{
      schemaVersion: 1, id: 'reviewed-inventory', countryCode: 'UG', name: 'Reviewed livestock inventory', sample: false,
      updatedAt: now, step: 4, status: 'ready',
      selection: { schemaVersion: 1, countryCode: 'UG', frameworkId: 'ipcc-2006', hierarchyVersion: '2006-table8.2-level3-v1', selectedCodes: ['3.A.1'], savedAt: now },
      sources: [{ id: 'collected', name: 'Reviewed source', version: '2024', unit: 't CO2e', basis: '100-year GWP', importedAt: now, rows: [{ category: '3.A.1', district: 'Arua', entryId: 'holding-1', entryName: 'Arua holding', year: 2024, value: 100 }] }],
      activeCategory: '3.A.1', start: 2024, end: 2024,
      thresholds: { r2: 0.95, mape: 5, bias: 2, coverage: 90 },
      assignments: { [JSON.stringify(['3.A.1', 'Arua'])]: 'collected' }, decisions: {}, notes: {},
      recalculations: { '3.A.1': { method: 'none', start: 2024, change: 2024, overlapStart: 2024, overlapEnd: 2023, includeBase: true, justification: 'Reviewed basis', applied: true } },
      focalPoints: { '3.A.1': 'Compiler' }, reviewer: 'Reviewer', acknowledged: true, audit: [{ at: now, action: 'Reviewed' }],
    }]));
  });
  await page.getByRole('button', { name: 'Open all tools' }).click();
  await page.getByRole('navigation', { name: 'All workspace tools' }).getByRole('link', { name: /Scenario Analysis/ }).click();
  await page.getByRole('button', { name: 'New scenario' }).click();
  await page.getByRole('textbox', { name: 'Scenario name' }).fill('District plan');
  await expect(page.getByRole('combobox', { name: 'Reporting area', exact: true })).toHaveValue('Arua');
  await page.getByRole('button', { name: 'Create scenario', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Which actions go in this scenario?', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Feed quality and additives', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Set the timing', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Edit Feed quality and additives', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Reduction at full uptake (%)', exact: true }).fill('12');
  await page.getByRole('textbox', { name: 'Evidence or assumption', exact: true }).fill('Analyst-defined hypothetical reduction for the planning exercise.');
  await page.getByRole('button', { name: 'Save action details', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Set the timing', exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const key = 'ndc-inventory-exercises-v1:UG';
    const exercises = JSON.parse(localStorage.getItem(key)!);
    exercises[0].sources[0].rows.find((row: { district: string; year: number }) => row.district === 'Arua' && row.year === 2024).value += 1;
    localStorage.setItem(key, JSON.stringify(exercises));
  });
  await page.reload();
  await page.getByRole('button', { name: /District plan/ }).click();
  await expect(page.getByRole('status')).toContainText('keeps its original snapshot');
});
