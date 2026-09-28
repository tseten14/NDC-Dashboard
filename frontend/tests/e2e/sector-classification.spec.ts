import { test, expect, type Page } from '@playwright/test';

async function openWorkspace(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Uganda Full cockpit available/ }).click();
  await page.getByRole('button', { name: 'Open all tools' }).click();
  const nav = page.getByRole('navigation', { name: 'All workspace tools' });
  await nav.getByRole('link', { name: /Sector Classification/ }).click();
  await expect(page.getByRole('heading', { name: 'Exercises', exact: true })).toBeVisible();
}
async function create(page: Page, name = 'AFOLU 2025') {
  await page.getByRole('button', { name: 'New exercise', exact: true }).click();
  await page.getByRole('textbox', { name: 'Exercise name' }).fill(name);
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
}
async function resume(page: Page, name = 'AFOLU 2025') {
  await page.getByRole('button', { name: new RegExp(name) }).click();
}
async function chooseCategory(page: Page) {
  await page.getByRole('textbox', { name: 'Search sectors by name or code' }).fill('3.A.1');
  await page.getByRole('checkbox', { name: '3.A.1 Enteric Fermentation', exact: true }).check();
}

test('classification: exercise creation, keyboard selection, persistence and safe framework switching', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const crashes: string[] = []; page.on('pageerror', e => crashes.push(e.message));
  await openWorkspace(page); await page.screenshot({ path: 'test-results/inventory-exercises.png' });
  await page.screenshot({ path: 'test-results/inventory-exercises-light.png' });
  await create(page);
  await page.getByRole('button', { name: /^Expand 3 Agriculture/ }).click();
  const livestock = page.getByRole('checkbox', { name: '3.A Livestock' });
  await livestock.focus(); await page.keyboard.press('Space');
  await expect(livestock).toBeChecked();
  await page.getByRole('button', { name: 'Save selection', exact: true }).click();
  await page.reload(); await resume(page);
  await page.getByRole('button', { name: /^Review selection/ }).click();
  await expect(page.getByRole('button', { name: 'Remove 3.A.2 Manure Management' })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('radio', { name: 'IPCC 2006 + 2019 Refinement', exact: true }).click();
  await page.getByRole('button', { name: 'Keep current framework', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'IPCC 2006', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Continue to time series' }).click();
  await expect(page.getByRole('heading', { name: 'Start with your collected reference' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to recalculation' })).toBeDisabled();
  expect(crashes).toEqual([]);
});

test('classification: sample comparisons, district mix, recalculation, sign-off and invalidation', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1050 });
  const crashes: string[] = []; page.on('pageerror', e => crashes.push(e.message));
  await openWorkspace(page);
  await page.getByRole('button', { name: 'Explore a sample exercise' }).click();
  await expect(page.getByRole('note')).toContainText('synthetic');
  await page.getByRole('button', { name: 'Residuals', exact: true }).click();
  await page.getByRole('button', { name: 'Scatter vs collected' }).click();
  await page.getByRole('button', { name: 'Time series', exact: true }).click();
  const chartDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export chart', exact: true }).click();
  expect((await chartDownload).suggestedFilename()).toBe('inventory-comparison.svg');
  await page.locator('#main-content').evaluate(element => element.scrollTo({ top: 0 }));
  await page.screenshot({ path: 'test-results/inventory-national.png', fullPage: true });
  await page.getByRole('button', { name: 'By district', exact: true }).click();
  await page.getByRole('button', { name: 'Auto-assign best fit', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Use for Mukono', exact: true })).toHaveValue('b');
  await expect(page.getByRole('combobox', { name: 'Use for Gulu', exact: true })).toHaveValue('collected');
  await page.screenshot({ path: 'test-results/inventory-districts.png', fullPage: true });
  await page.getByRole('textbox', { name: 'Search districts' }).fill('Arua');
  await page.getByRole('button', { name: 'Review entries & notes' }).click();
  await page.getByRole('checkbox', { name: 'Select all visible entries' }).check();
  await page.getByRole('button', { name: 'Collected', exact: true }).click();
  await page.getByRole('textbox', { name: /General note on Arua/ }).fill('Retain collected estimates until the next survey confirms holding coverage.');
  await page.screenshot({ path: 'test-results/inventory-entries.png', fullPage: true });
  await page.getByRole('button', { name: 'Use this mix for Arua' }).click();
  await expect(page.getByRole('combobox', { name: 'Use for Arua', exact: true })).toHaveValue('mix');
  await page.getByRole('button', { name: 'Continue to recalculation' }).click();
  await page.getByRole('radio', { name: /^Overlap/ }).check();
  await page.getByRole('textbox', { name: 'Justification for the inventory report' }).fill('Overlap checked against the imported estimates; stable ratios support the historical adjustment.');
  await page.getByRole('button', { name: 'Append officer notes' }).click();
  await expect(page.getByRole('textbox', { name: 'Justification for the inventory report' })).toContainText('Retain collected');
  await page.getByRole('button', { name: 'Apply recalculation', exact: true }).click();
  await page.screenshot({ path: 'test-results/inventory-recalculation.png', fullPage: true });
  await page.getByRole('button', { name: 'Review inventory basis' }).click();
  await expect(page.getByRole('button', { name: 'Prepare sign-off package' })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Focal point for 3.A.1' }).fill('Inventory team');
  await page.getByRole('textbox', { name: 'Reviewer / institution' }).fill('National inventory reviewer');
  await page.getByRole('checkbox', { name: /I have reviewed/ }).check();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Prepare sign-off package' }).click();
  const packageDownload = await download;
  expect(packageDownload.suggestedFilename()).toBe('inventory-sign-off-package.json');
  const packagePath = await packageDownload.path();
  await expect(page.getByRole('status').filter({ hasText: 'Sign-off package prepared' })).toBeVisible();
  await page.screenshot({ path: 'test-results/inventory-review.png', fullPage: true });
  await page.reload(); await resume(page, 'Livestock');
  await expect(page.getByRole('textbox', { name: 'Focal point for 3.A.1' })).toHaveValue('Inventory team');
  await page.getByRole('navigation', { name: 'Exercise progress' }).getByRole('button', { name: /Time series/ }).click();
  await page.getByRole('button', { name: 'By district', exact: true }).click();
  await page.getByRole('combobox', { name: 'Use for Kampala', exact: true }).selectOption('collected');
  await page.getByRole('navigation', { name: 'Exercise progress' }).getByRole('button', { name: /Review & submit/ }).click();
  await expect(page.getByRole('button', { name: 'Prepare sign-off package' })).toBeDisabled();
  await page.getByRole('button', { name: 'All exercises', exact: true }).click();
  await page.getByLabel('Restore exercise backup', { exact: true }).setInputFiles(packagePath!);
  await expect(page.getByRole('button', { name: /Livestock · guided sample · restored/ })).toBeVisible();
  expect(crashes).toEqual([]);
});

test('classification: import real CSV, reject invalid units, complete a collected-only inventory', async ({ page }) => {
  await openWorkspace(page); await create(page, 'Imported inventory'); await chooseCategory(page);
  await page.getByRole('button', { name: 'Continue to time series' }).click();
  await page.getByRole('button', { name: 'Import collected data', exact: true }).click();
  await page.getByRole('textbox', { name: 'Release / survey version' }).fill('Survey 2024 v1');
  const csv = 'category,district,entry_id,entry_name,year,value,unit,basis\n' + Array.from({ length: 15 }, (_, i) => `3.A.1,National,total,National total,${2010 + i},${100 + i},Gg CO2e,AR5 GWP100`).join('\n');
  await page.getByLabel('CSV file', { exact: true }).setInputFiles({ name: 'reference.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.getByRole('button', { name: 'Validate and import', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Import data source', exact: true }).click();
  await page.getByRole('combobox', { name: 'Source slot' }).selectOption('a');
  await page.getByLabel('CSV file', { exact: true }).setInputFiles({ name: 'bad.csv', mimeType: 'text/csv', buffer: Buffer.from(csv.replaceAll('Gg CO2e', 'head')) });
  await page.getByRole('button', { name: 'Validate and import', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unit or basis');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Use collected for all' }).click();
  await page.getByRole('button', { name: 'Continue to recalculation' }).click();
  await page.getByRole('textbox', { name: 'Justification for the inventory report' }).fill('Collected estimates retain their original reporting basis.');
  await page.getByRole('button', { name: 'Apply recalculation', exact: true }).click();
  await page.getByRole('button', { name: 'Review inventory basis' }).click();
  await page.getByRole('textbox', { name: 'Focal point for 3.A.1' }).fill('Compiler');
  await page.getByRole('textbox', { name: 'Reviewer / institution' }).fill('Reviewer');
  await page.getByRole('checkbox', { name: /I have reviewed/ }).check();
  await expect(page.getByRole('button', { name: 'Prepare sign-off package' })).toBeEnabled();
});

test('classification: phone and tablet workflow has no page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWorkspace(page);
  await page.screenshot({ path: 'test-results/inventory-mobile-home.png' });
  await page.getByRole('button', { name: 'Explore a sample exercise' }).click();
  await expect(page.getByRole('heading', { name: 'Time series', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'By district', exact: true }).click();
  await page.getByRole('button', { name: 'Auto-assign best fit' }).click();
  await page.screenshot({ path: 'test-results/inventory-mobile-districts.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Continue to recalculation' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Review inventory basis' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: 'test-results/inventory-tablet-review.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
