import { test, expect } from '@playwright/test';

test('Database initializes and loads data', async ({ page }) => {
  // Go to home page
  await page.goto('/');

  // Wait for dbStore to initialize (the header is always visible)
  await expect(page.locator('h1', { hasText: 'My Library' })).toBeVisible();

  // Wait for DB to initialize
  await page.waitForFunction(() => (window as any).__dbStore?.facade !== null && (window as any).__dbStore?.facade !== undefined);

  // Insert a mock record
  await page.evaluate(async () => {
    const store = (window as any).__dbStore;
    await store.facade.content.create({
      id: 'e2e-vid-1',
      type: 'video',
      createdAt: Date.now(),
      title: 'Playwright Test Video',
      durationMs: 60000
    });
  });

  // Give it a moment to process
  await page.waitForTimeout(500);

  // Assert that the record was actually inserted into the database
  const count = await page.evaluate(async () => {
    const store = (window as any).__dbStore;
    const res = await store.facade.content.listByType('video');
    return res.value?.filter((v: any) => v.title === 'Playwright Test Video').length || 0;
  });

  expect(count).toBeGreaterThan(0);
});
