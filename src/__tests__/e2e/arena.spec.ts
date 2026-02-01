import { test, expect } from '@playwright/test';

test.describe('Arena', () => {
  test('should show arena page', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByRole('heading', { name: 'The Arena' })).toBeVisible();
  });

  test('should show leaderboard tabs', async ({ page }) => {
    await page.goto('/arena');
    await expect(page.getByRole('button', { name: 'Top Bots' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Top Judges' })).toBeVisible();
  });

  test('should switch between bots and judges leaderboard', async ({ page }) => {
    await page.goto('/arena');

    // Default should be bots
    await expect(page.getByRole('button', { name: 'Top Bots' })).toBeVisible();

    // Click judges tab
    await page.click('text=Top Judges');

    // Should show judges leaderboard (credibility column)
    await expect(page.getByText('Credibility')).toBeVisible();
  });

  test('should show arena status', async ({ page }) => {
    await page.goto('/arena');

    // Should show status cards
    await expect(page.getByText('Qualified Bots')).toBeVisible();
    await expect(page.getByText('Active Judges')).toBeVisible();
    await expect(page.getByText('Arena Status')).toBeVisible();
  });

  test('should link to dashboard', async ({ page }) => {
    await page.goto('/arena');
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/dashboard');
  });
});
