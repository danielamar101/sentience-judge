import { test, expect } from '@playwright/test';

test.describe('Homepage Video', () => {
  test('should display video on homepage', async ({ page }) => {
    await page.goto('/');

    // Check if video element exists
    const video = page.locator('video');
    await expect(video).toBeVisible();

    // Check video src
    const src = await video.getAttribute('src');
    expect(src).toBe('/emergent-ai.mp4');

    // Wait for video to load
    await page.waitForTimeout(2000);

    // Check video state
    const videoState = await page.evaluate(() => {
      const video = document.querySelector('video');
      if (!video) return null;
      return {
        readyState: video.readyState,
        error: video.error ? video.error.message : null
      };
    });

    console.log('Video state:', videoState);
    expect(videoState?.error).toBeNull();
    expect(videoState?.readyState).toBeGreaterThanOrEqual(2);
  });
});
