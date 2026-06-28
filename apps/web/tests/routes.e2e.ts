import { test, expect } from '@playwright/test';

test('Home page renders layout and library grid', async ({ page }) => {
  await page.goto('/');

  // Layout header
  await expect(page.locator('header')).toBeVisible();
  await expect(page.locator('header a', { hasText: "Watch'nt" })).toBeVisible();

  // Page title
  await expect(page.locator('h1', { hasText: 'My Library' })).toBeVisible();

  // Video cards (mock data)
  await expect(page.locator('text=Example Video 1')).toBeVisible();
  await expect(page.locator('text=Example Video 2')).toBeVisible();
});

test('Video page navigation', async ({ page }) => {
  await page.goto('/');

  // Click on the first video
  await page.click('text=Example Video 1');

  // Verify URL change
  await expect(page).toHaveURL(/\/video\/vid-1/);

  // Verify Video page renders
  await expect(page.locator('h3', { hasText: 'Video Details (ID: vid-1)' })).toBeVisible();
  
  // Navigate back
  await page.click('text=Back to Library');
  await expect(page).toHaveURL(/.*\/$/);
});
