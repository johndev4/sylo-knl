import { test, expect } from '@playwright/test';

test.describe('Chat Page UI & Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'test-user', email: 'test@example.com' },
      });
    });

    // Mock library members fetch (used by getUserLibraries server action indirectly via Supabase client)
    // Actually, server actions run on the server, so route.fulfill on the client won't catch them
    // unless the server action itself makes a request that we can intercept if it's running in the same process.
    // However, Playwright mocks work by intercepting browser-side requests.
    // If the page is SSR, we can't intercept the server-side fetch to Supabase.
    // But we can mock the initial page load response if we want, or rely on the fact that
    // in a test environment, we might need a different approach for SSR.
    
    // For this test, I'll assume we can mock the browser-side calls if any, 
    // but since getUserLibraries is called in the RSC, it won't be caught by page.route.
    // Workaround: Mock the /hub/chat page response itself or use a test database.
    // Given the constraints, I will mock the chat page response to include the necessary data
    // if I can, but usually Playwright tests against a running server.
    
    // Let's try to mock the /hub/chat navigation
    // However, the best way for RSC is to use a test DB or mock the Supabase client on the server.
    // Allow auth bypass on server for tests
    const domains = ['127.0.0.1', 'localhost'];
    for (const domain of domains) {
      await page.context().addCookies([
        {
          name: 'playwright-test',
          value: 'true',
          domain,
          path: '/',
        },
      ]);
    }
  });

  test('Sidebar and Pinned Input layout', async ({ page }) => {
    await page.goto('/hub/chat');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be present (using role or tag)
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    await expect(sidebar).toContainText('AI Knowledge Chat');
    await expect(sidebar).toContainText('Mock Library 1');
    await expect(sidebar).toContainText('Mock Library 2');

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
