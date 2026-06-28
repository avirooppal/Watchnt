import { test, expect } from '@playwright/test';

test('Home page renders layout and library grid', async ({ page }) => {
  await page.goto('/');

  // Layout header
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('header a', { hasText: "Watch'nt" })).toBeVisible();

  // Page title
  await expect(page.locator('h1', { hasText: 'My Library' })).toBeVisible();

});
