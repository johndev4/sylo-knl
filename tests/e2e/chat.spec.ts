import { test, expect } from '@playwright/test';
import { getTestData } from './utils/test-data';

test.describe('Chat Page UI & Sidebar', () => {
  let testData: ReturnType<typeof getTestData>;

  test.beforeAll(() => {
    testData = getTestData();
  });

  test('Sidebar and Pinned Input layout', async ({ page }) => {
    await page.goto('/hub/chat');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be present (using role or tag)
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    await expect(sidebar).toContainText('AI Knowledge Chat');
    await expect(sidebar).toContainText(testData.testLibraryName);
    await expect(sidebar).toContainText(testData.testLibraryName2);

    // Input section should be pinned at the bottom
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Chat history area should have independent scroll
    const main = page.locator('main');
    await expect(main).toHaveClass(/overflow-y-auto/);
  });

  test('Sidebar toggling works', async ({ page }) => {
    await page.goto('/hub/chat');
    await page.waitForLoadState('networkidle');
    
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Collapse
    const collapseBtn = page.getByLabel('Collapse sidebar');
    await collapseBtn.click();
    
    // Sidebar should be in collapsed state (slim div)
    // In our implementation, the <aside> is replaced by a <div> if !isOpen
    await expect(sidebar).not.toBeVisible();
    const openBtn = page.getByLabel('Open sidebar');
    await expect(openBtn).toBeVisible();

    // Expand
    await openBtn.click();
    await expect(page.locator('aside').first()).toBeVisible();
    await expect(page.locator('aside').first()).toContainText('AI Knowledge Chat');
  });
});
