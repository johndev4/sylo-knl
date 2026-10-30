import { test, expect } from '@playwright/test';
import { getTestData } from './utils/test-data';

test.describe('Chat Page UI & Sidebar', () => {
  let testData: ReturnType<typeof getTestData>;

  test.beforeAll(() => {
    testData = getTestData();
  });

  test('Library Selector and Pinned Input layout', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Inline library selector should be present
    const selector = page.getByRole('button', { name: /Select librar|All libraries|libraries/i });
    await expect(selector).toBeVisible({ timeout: 10000 });

    // Input section should be pinned at the bottom
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Chat history area should have independent scroll
    const messagesArea = page.getByLabel('Chat messages');
    await expect(messagesArea).toHaveClass(/overflow-y-auto/);
  });

  // Sidebar toggling is no longer applicable as sidebar was removed.
  // We verify the library selector opens a popover instead.
  test('Library selector opens popover', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const selector = page.getByRole('button', { name: /Select librar|All libraries|libraries/i });
    await selector.click();

    // Command palette/Popover should be visible
    const popover = page.locator('[role="dialog"]');
    await expect(popover).toBeVisible();
    await expect(popover.locator('input[placeholder="Search libraries…"]')).toBeVisible();
  });
});
