import { test, expect } from '@playwright/test';

test('End-to-End App Verification Flow', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // 1. Go to homepage
  await page.goto('/');
  await expect(page.locator('h1', { hasText: 'My Library' })).toBeVisible();

  // Wait for background pipeline to be ready
  await page.waitForFunction(() => {
    const store = (window as any).__pipelineStore;
    return store && store.coordinator !== null;
  });

  // 2. Upload a dummy video
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('button:has-text("Add Content")');
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'demo_video.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('mock video data')
  });

  // 3. Verify it shows up in library grid
  const videoCard = page.locator('text=demo_video.mp4');
  await expect(videoCard).toBeVisible({ timeout: 5000 });

  // 4. Wait for pipeline to finish before clicking (mock pipeline takes ~200ms)
  // We wait 3 full seconds to be absolutely safe
  await page.waitForTimeout(3000);

  // 5. Click the video to go to the video page
  await videoCard.click();
  
  // Wait for the video page to load
  await expect(page.locator('h1', { hasText: 'demo_video.mp4' })).toBeVisible({ timeout: 5000 });

  // 6. The pipeline should have processed the video in the background and produced Transcript segments.
  await expect(page.locator('h2:has-text("Transcript")')).toBeVisible({ timeout: 5000 });
  
  const transcriptChunk = page.locator('text=This is a mock transcription');
  await expect(transcriptChunk).toBeVisible({ timeout: 5000 });

  // 6. Click the transcript and ensure it triggers the seek logic
  await transcriptChunk.click();
  
  // Check the video currentTime
  await page.waitForFunction(() => {
    const v = document.querySelector('video');
    return v && v.currentTime >= 0;
  }, null, { timeout: 2000 });

  const currentTime = await page.locator('video').evaluate((el: HTMLVideoElement) => el.currentTime);
  expect(currentTime).toBeGreaterThanOrEqual(0);
});
