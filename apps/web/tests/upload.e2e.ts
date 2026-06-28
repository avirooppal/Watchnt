import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('File upload initiates processing pipeline', async ({ page }) => {
  await page.goto('/');

  // Wait for the library
  await expect(page.locator('h1', { hasText: 'My Library' })).toBeVisible();

  // Wait for background stores to initialize
  await page.waitForFunction(() => {
    const store = (window as any).__pipelineStore;
    return store && store.coordinator !== null;
  });

  // Create a dummy webm file in memory for upload
  const mockFileContent = Buffer.from('mock video data');

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // We can't directly trigger file input in playwright without setInputFiles
  // But our button triggers the click on a hidden input.
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.click('button:has-text("Add Content")');
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles({
    name: 'test_upload.webm',
    mimeType: 'video/webm',
    buffer: mockFileContent
  });

  // Verify that the file upload creates a record in the UI
  await expect(page.locator('text=test_upload.webm')).toBeVisible({ timeout: 5000 });
});
