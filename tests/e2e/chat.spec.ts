import { test, expect } from '@playwright/test';
import { getTestData } from './utils/test-data';

test.describe('Chat Page UI & Sidebar', () => {
  let testData: ReturnType<typeof getTestData>;

  test.beforeAll(() => {
    testData = getTestData();
  });

  test('Sidebar and Pinned Input layout', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    // Sidebar should be present (using role or tag)
    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    await expect(sidebar).toContainText('Chat');
    await expect(sidebar).toContainText(testData.testLibraryName);
    await expect(sidebar).toContainText(testData.testLibraryName2);

    // Input section should be pinned at the bottom
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    // Chat history area should have independent scroll
    const messagesArea = page.getByLabel('Chat messages');
    await expect(messagesArea).toHaveClass(/overflow-y-auto/);
  });

  test('Sidebar toggling works', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-slot="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Collapse
    const collapseBtn = page.getByLabel('Toggle Sidebar');
    await collapseBtn.click();

    // Sidebar should be in collapsed state
    // For offcanvas, the sidebar container is shifted out of view
    await expect(sidebar).not.toBeVisible();
    const openBtn = page.getByLabel('Toggle Sidebar');
    await expect(openBtn).toBeVisible();

    // Expand
    await openBtn.click();
    await expect(page.locator('[data-slot="sidebar"]').first()).toBeVisible();
    await expect(page.locator('[data-slot="sidebar"]').first()).toContainText(
      'Chat'
    );
  });
});
