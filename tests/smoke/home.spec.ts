import { test, expect } from '@playwright/test';

test('home page loads, presets render, mic button visible', async ({ page, context }) => {
  await context.grantPermissions(['microphone']);

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  await page.goto('./');
  await expect(page.locator('h1')).toHaveText(/time-displaced ears/i);
  await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('#presets button')).toHaveCount(5);
  await expect(page.locator('#analyze')).toBeVisible();

  await page.locator('#presets button[data-preset="whale-song"]').click();
  await expect(page.locator('#presets button[data-preset="whale-song"]')).toHaveClass(/active/);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('start button kicks the engine into a non-idle state', async ({ page, context }) => {
  await context.grantPermissions(['microphone']);
  await page.goto('./');

  await page.locator('#start').click();
  await expect(page.locator('#badge')).not.toHaveText('mic: off', { timeout: 5_000 });
});
