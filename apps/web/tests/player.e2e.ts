import { test, expect } from '@playwright/test';

test('Video playback and transcript interaction', async ({ page }) => {
  // Go to homepage first to ensure DB initializes
  await page.goto('/');
  await page.waitForFunction(() => {
    const store = (window as any).__dbStore;
    return store && store.facade !== null;
  });

  // Inject mock data
  await page.evaluate(async () => {
    const store = (window as any).__dbStore;
    await store.facade.content.create({ id: 'test', type: 'video', createdAt: Date.now(), title: 'Test Video' });
    await store.facade.knowledge.addFragment({
      id: 'frag-1',
      content_id: 'test',
      type: 'chunk',
      content: 'Welcome to this demo video.',
      metadata: JSON.stringify({ startMs: 0, endMs: 5000 })
    });
    await store.facade.knowledge.addFragment({
      id: 'frag-2',
      content_id: 'test',
      type: 'chunk',
      content: 'Here we discuss AI architectures.',
      metadata: JSON.stringify({ startMs: 5000, endMs: 12000 })
    });
  });

  // Now go to the video page
  await page.goto('/video/test');

  // Verify elements render
  await expect(page.locator('video')).toBeVisible();
  await expect(page.locator('text=Transcript')).toBeVisible();
  
  // Verify the mock transcript items render
  await expect(page.locator('text=Welcome to this demo video.')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=Here we discuss AI architectures.')).toBeVisible();

  // Click on the second transcript segment (starts at 5s)
  await page.click('text=Here we discuss AI architectures.');

  // The video time should now be set to 5. 
  // We don't wait for loadedmetadata because headless browsers sometimes block media.
  // Instead we directly query the DOM state.
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v && v.currentTime === 5;
  }, null, { timeout: 2000 });

  const currentTime = await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime);
  expect(currentTime).toBe(5);
});
