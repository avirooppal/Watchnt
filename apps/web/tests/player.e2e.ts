import { test, expect } from '@playwright/test';

test('Video playback and transcript interaction', async ({ page }) => {
  // Go directly to the video page for ID 'test'
  await page.goto('/video/test');

  // Verify elements render
  await expect(page.locator('video')).toBeVisible();
  await expect(page.locator('text=Transcript')).toBeVisible();
  
  // Verify the mock transcript items render
  await expect(page.locator('text=Welcome to this demo video.')).toBeVisible();
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
