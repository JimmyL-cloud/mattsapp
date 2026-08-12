import { expect, test } from '@playwright/test';

test('owner can authenticate, analyze reviewed evidence, save, purchase, and sign out', async ({ page, context, request }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  expect((await request.get('/api/analyses')).status()).toBe(401);
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
  await expect(page.getByRole('heading', { name: 'Analyze a Card' })).toBeVisible();

  const csv = [
    'source_record_id,title,sale_price,shipping,buyer_premium,tax,currency,sale_type,status,sold_at,timezone',
    'csv-e2e-1,2024 Prizm Test Player 101 Silver RAW,125.00,0,0,,USD,FIXED_PRICE,SOLD,2026-08-01T12:00:00Z,UTC',
  ].join('\n');
  const imported = await page.request.post('/api/imports', { data: { csv, sourceKey: 'e2e-csv', sourceLabel: 'E2E owner CSV', isDemo: false } });
  expect(imported.status()).toBe(200);
  expect((await imported.json()).accepted).toBe(1);
  await page.reload();

  await page.getByLabel('Player name', { exact: true }).fill('Test Player');
  await page.getByLabel('Year', { exact: true }).fill('2024');
  await page.getByLabel('Brand', { exact: true }).fill('Prizm');
  await page.getByLabel('Set', { exact: true }).fill('Prizm');
  await page.getByLabel('Card #', { exact: true }).fill('101');
  await page.getByLabel('Parallel / variation', { exact: true }).fill('Silver');
  await page.getByLabel('Asking price ($)').fill('100');
  const useTarget = page.getByRole('button', { name: 'Use target identity' });
  const manualCompCount = await useTarget.count();
  for (let index = 0; index < manualCompCount; index += 1) await useTarget.nth(index).evaluate((button: HTMLButtonElement) => button.click());
  const sourceLabels = page.getByLabel('Source label');
  const listingTitles = page.getByLabel('Listing / receipt description');
  const soldPrices = page.getByLabel('Sold price ($)');
  for (let index = 0; index < await sourceLabels.count(); index += 1) {
    await sourceLabels.nth(index).fill(`Manual receipt ${index + 1}`);
    await listingTitles.nth(index).fill(`2024 Prizm Test Player 101 Silver RAW ${index + 1}`);
    await soldPrices.nth(index).fill(index === 0 ? '120' : '130');
  }
  await page.getByLabel('Use in this analysis').check();
  await expect(page.getByRole('button', { name: /ANALYZE CARD/ })).toBeEnabled();
  await page.getByRole('button', { name: /ANALYZE CARD/ }).click();
  await expect(page.getByText(/Review the title-only imported row/)).toBeVisible();
  await page.getByLabel(/I reviewed this listing title/).check();
  await page.getByRole('button', { name: /ANALYZE CARD/ }).click();
  await expect(page.getByRole('heading', { name: /Test Player.*RAW/i })).toBeVisible();
  await expect(page.getByText('3 REAL RECORDS')).toBeVisible();

  await page.getByRole('button', { name: 'Copy analysis JSON' }).click();
  await expect(page.getByRole('status')).toContainText('copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Test Player');
  await page.getByRole('button', { name: 'Save to Watchlist' }).click();
  await expect(page.getByRole('status')).toContainText('Saved to watchlist');
  await page.getByRole('button', { name: 'Record Purchase' }).click();
  await page.getByLabel('Actual all-in amount').fill('105.25');
  await page.getByLabel('Purchase source').fill('Local card show receipt');
  await page.getByRole('button', { name: 'Save Purchase' }).click();
  await expect(page.getByRole('status')).toContainText('Purchase and holding recorded');

  await page.getByRole('link', { name: 'History' }).first().click();
  await expect(page.getByRole('heading', { name: 'Analysis History' })).toBeVisible();
  await expect(page.locator('tbody').getByText('PURCHASED', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Watchlist' }).first().click();
  await page.getByRole('button', { name: 'Star card' }).click();
  await expect(page.getByRole('button', { name: 'Remove star' })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/portfolio');
  await expect(page.getByText('1 OPEN HOLDINGS')).toBeVisible();
  await expect(page.getByText('$105.25').first()).toBeVisible();
  await expect(page.getByText('NOT RECORDED').first()).toBeVisible();

  await page.getByRole('button', { name: 'LOG OUT' }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/history');
  await expect(page).toHaveURL(/\/login$/);
});
