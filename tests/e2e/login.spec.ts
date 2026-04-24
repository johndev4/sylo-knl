import { test, expect } from '@playwright/test';

test.describe('Public auth flow', () => {
  test('redirects unauthenticated root to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('renders Supabase login providers on the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('button', { hasText: /google/i })).toBeVisible();
  });
});
