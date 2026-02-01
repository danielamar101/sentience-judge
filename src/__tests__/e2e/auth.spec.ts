import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show register page', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
  });

  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up');
    await expect(page).toHaveURL('/register');

    await page.click('text=Sign in');
    await expect(page).toHaveURL('/login');
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name=email]', 'invalid-email');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'Password123');
    await page.click('button[type=submit]');

    // Should stay on register page with error
    await expect(page).toHaveURL('/register');
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'Password123');
    await page.fill('[name=confirmPassword]', 'DifferentPassword123');
    await page.click('button[type=submit]');

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });
});
