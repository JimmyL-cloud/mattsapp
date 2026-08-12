import { expect, test, type Page } from '@playwright/test';

async function fillManualEvidence(page: Page, player: string) {
  await page.getByLabel('Player name', { exact: true }).fill(player);
  await page.getByLabel('Year', { exact: true }).fill('2024');
  await page.getByLabel('Brand', { exact: true }).fill('Prizm');
  await page.getByLabel('Set', { exact: true }).fill('Prizm');
  await page.getByLabel('Card #', { exact: true }).fill('101');
  await page.getByLabel('Parallel / variation', { exact: true }).fill('Silver');
  await page.getByLabel('Asking price ($)').fill('100');
  const sources = page.getByLabel('Source label');
  for (let index = 0; index < await sources.count(); index += 1) {
    await sources.nth(index).fill(`Manual receipt ${index + 1}`);
    await page.getByLabel('Listing / receipt description').nth(index).fill(`2024 Prizm ${player} 101 Silver RAW ${index + 1}`);
    await page.getByLabel('Sold price ($)').nth(index).fill(index === 0 ? '120' : '130');
    await page.getByLabel(`Comp ${index + 1} player name`).fill(player);
    await page.getByLabel(`Comp ${index + 1} year`).fill('2024');
    await page.getByLabel(`Comp ${index + 1} brand`).fill('Prizm');
    await page.getByLabel(`Comp ${index + 1} set`).fill('Prizm');
    await page.getByLabel(`Comp ${index + 1} card number`).fill('101');
    await page.getByLabel(`Comp ${index + 1} parallel`).fill('Silver');
  }
}

test('owner workflow protects APIs and persists reviewed real records', async ({ page, context, request }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const suffix = testInfo.project.name.replace(/[^a-z]/g, '-');
  const player = `Test Player ${suffix}`;

  for (const api of ['/api/analyses', '/api/imports', '/api/watchlist', '/api/settings']) expect((await request.get(api)).status()).toBe(401);
  for (const route of ['/', '/history', '/watchlist', '/portfolio', '/performance', '/data', '/settings']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }

  await expect(page.getByText('matt@example.test')).toBeVisible();
  const password = page.getByRole('textbox', { name: /PASSWORD/ });
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await password.fill('local-e2e-password');
  await page.getByRole('button', { name: 'ENTER TERMINAL' }).click();
  await expect(page).toHaveURL('/');

  const csv = [
    'source_record_id,title,sale_price,shipping,buyer_premium,tax,currency,sale_type,status,sold_at,timezone,player_name,year,brand,set_name,card_number,parallel,condition',
    `${suffix}-title,2024 Prizm ${player} 101 Silver RAW,125.00,0,0,,USD,FIXED_PRICE,SOLD,2026-08-01T12:00:00Z,UTC,,,,,,,`,
    `${suffix}-structured,Structured ${player},127.00,0,0,,USD,FIXED_PRICE,SOLD,2026-08-02T12:00:00Z,UTC,${player},2024,Prizm,Prizm,101,Silver,RAW`,
  ].join('\n');
  const imported = await page.request.post('/api/imports', { data: { csv, sourceKey: `e2e-${suffix}`, sourceLabel: `E2E ${suffix} CSV`, isDemo: false } });
  expect(imported.status()).toBe(200);
  expect((await imported.json()).accepted).toBe(2);
  await page.reload();
  const importedRows = page.locator('fieldset').filter({ hasText: player });
  await expect(importedRows.getByText('TITLE-ONLY CSV')).toBeVisible();
  await expect(importedRows.getByText('STRUCTURED CSV')).toBeVisible();
  await fillManualEvidence(page, player);

  const selectors = importedRows.getByLabel('Use in this analysis');
  await expect(selectors).toHaveCount(2);
  await selectors.nth(0).check();
  await selectors.nth(1).check();
  await page.getByRole('button', { name: /ANALYZE CARD/ }).click();
  await expect(page.getByText(/Review the title-only imported row/)).toBeVisible();
  await importedRows.getByLabel(/I reviewed this listing title/).check();
  await page.getByRole('button', { name: /ANALYZE CARD/ }).click();
  await expect(page.getByRole('heading', { name: new RegExp(`${player}.*RAW`, 'i') })).toBeVisible();
  await expect(page.getByText('4 REAL RECORDS')).toBeVisible();

  await page.getByRole('button', { name: 'Copy analysis JSON' }).click();
  await expect(page.getByRole('status')).toContainText('copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(player);
  await page.getByRole('button', { name: 'Save to Watchlist' }).click();
  await page.getByRole('button', { name: 'Record Purchase' }).click();
  await page.getByLabel('Actual all-in amount').fill('105.25');
  await page.getByLabel('Purchase source').fill('Local card show receipt');
  await page.getByRole('button', { name: 'Save Purchase' }).click();
  await expect(page.getByRole('status')).toContainText('Purchase and holding recorded');

  await page.goto('/history');
  await expect(page.locator('tbody').getByText('PURCHASED', { exact: true }).first()).toBeVisible();
  await page.goto('/watchlist');
  const card = page.getByRole('heading', { name: new RegExp(player, 'i') }).locator('xpath=ancestor::article');
  await card.getByRole('button', { name: 'Star card' }).click();
  await expect(card.getByRole('status')).toHaveText('SAVED');
  await page.reload();
  await expect(page.getByRole('heading', { name: new RegExp(player, 'i') })).toBeVisible();
  const reloadedCard = page.getByRole('heading', { name: new RegExp(player, 'i') }).locator('xpath=ancestor::article');
  await expect(reloadedCard.getByRole('button', { name: 'Remove star' })).toHaveAttribute('aria-pressed', 'true');

  if (testInfo.project.name.startsWith('mobile')) {
    await page.getByRole('button', { name: /More/ }).click();
    await page.getByRole('link', { name: /Portfolio/ }).click();
  } else {
    await page.getByRole('link', { name: 'Portfolio' }).click();
  }
  await expect(page.getByText(/OPEN HOLDINGS/).first()).toBeVisible();
  await expect(page.getByText('$105.25').first()).toBeVisible();
  await expect(page.getByText('NOT RECORDED').first()).toBeVisible();
  await page.goto('/performance');
  await expect(page.getByRole('heading', { name: 'No matured outcomes yet' })).toBeVisible();
  await expect(page.getByText(/No synthetic benchmarks or placeholder scores/)).toBeVisible();

  if (testInfo.project.name.startsWith('mobile')) await page.getByRole('button', { name: /More/ }).click();
  await page.locator('.logout-button:visible').first().click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/analyses')).status()).toBe(401);
  expect((await page.request.get('/api/imports')).status()).toBe(401);
  await page.goto('/history');
  await expect(page).toHaveURL(/\/login$/);
});
