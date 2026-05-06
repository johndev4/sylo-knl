import { test, expect } from '@playwright/test';

// Use a valid UUID for routing to avoid Zod/Postgres errors
const libId = '00000000-0000-0000-0000-000000000000';

test.describe('Document Management', () => {
  // Setup: mock all API responses so tests run without a seeded DB.
  test.beforeEach(async ({ page }) => {
    // Mock Supabase auth
    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'test-user', email: 'test@example.com' },
      });
    });

    // Mock library details endpoint (used by DocumentsSidebar)
    await page.route('**/api/libraries/**', async (route) => {
      await route.fulfill({
        status: 200,
        json: { library: { id: libId, name: 'Test Library' } },
      });
    });

    // Mock GET documents list
    await page.route('**/api/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'doc-1',
              title: 'Mock Document 1',
              tags: ['TEST', 'MOCK'],
              author_ids: ['test-user'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          metadata: { total: 1, page: 1, limit: 100, totalPages: 1 },
        },
      });
    });

    // Mock single document CRUD operations
    await page.route('**/api/documents/**', async (route) => {
      const method = route.request().method();
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            document: {
              id: 'doc-1',
              title: 'Mock Document 1',
              content: '# Hello\nThis is a test.',
              tags: ['TEST', 'MOCK'],
              author_ids: ['test-user'],
              library_id: libId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              authors: [{ id: 'test-user', name: 'Test User' }],
            },
          },
        });
      } else if (method === 'PUT') {
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            document: { updated_at: new Date().toISOString() },
          },
        });
      } else if (method === 'DELETE') {
        await route.fulfill({ status: 200, json: { success: true } });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          json: { success: true, documentId: 'new-doc-id' },
        });
      } else {
        await route.continue();
      }
    });
  });

  test('List existing documents with filters in sidebar', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents`);
    await page.waitForLoadState('networkidle');

    // Verify empty state in main area
    await expect(
      page.getByRole('heading', { name: 'Select a Document' })
    ).toBeVisible({ timeout: 10000 });

    // Verify document appears in sidebar list
    // Use a more specific locator to avoid ambiguity if needed
    await expect(page.locator('aside').getByText('Mock Document 1')).toBeVisible({ timeout: 10000 });

    // Search input in sidebar
    const searchInput = page.getByPlaceholder('Search docs...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Mock');

    // Tag dropdown filter
    await expect(
      page.locator('[data-slot="select-trigger"]').or(page.getByRole('combobox')).first()
    ).toBeVisible();
  });

  test('Shows inline unauthorized component on restricted library page', async ({ page }) => {
    const unauthorizedLibId = '11111111-1111-1111-1111-111111111111';
    await page.goto(`/hub/libraries/${unauthorizedLibId}/documents`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(`/hub/libraries/${unauthorizedLibId}/documents`);
    await expect(page.getByRole('heading', { name: 'Unauthorized' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('You do not have permission to access this page.')).toBeVisible();
  });

  test('Create a new document with all required fields', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('My New Document');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible', timeout: 15000 });
    await editor.click();
    await editor.pressSequentially('This is the content of my new document.');

    // Add tag via tag input
    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('important');
    await tagInput.press('Enter');
    
    // Tags are now rendered in UPPERCASE
    await expect(page.getByText('IMPORTANT')).toBeVisible();

    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
  });

  test('View document details', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/doc-1`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({ timeout: 15000 });
    await expect(titleInput).toHaveValue('Mock Document 1');

    await expect(
      page.getByRole('button', { name: 'Edit Mode' })
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible();
  });

  test('Switch to edit mode and update document', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/doc-1`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Edit Mode' }).click();

    await expect(titleInput).toBeEnabled();
    await titleInput.fill('Updated Document Title');

    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
  });

  test('Navigation guard prompts on unsaved changes', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({ timeout: 15000 });

    // Type something to make it dirty
    await titleInput.fill('Unsaved Doc');

    // Try to navigate back or click a link
    // We'll mock window.confirm to return false (don't leave)
    await page.evaluate(() => {
      window.confirm = () => false;
    });

    // Click "Select a Library" or some other link if available, 
    // but here we can just try to click the sidebar title if it's a link
    // Let's try to click the library name in sidebar
    await page.getByText('Test Library').click();

    // Check if we are still on the same page (URL hasn't changed)
    expect(page.url()).toContain('/documents/new');

    // Now mock confirm to return true (leave)
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await page.getByText('Test Library').click();
    
    // Note: In this mock environment, navigation might be caught by the interceptor
    // but if confirm returns true, it should allow it.
  });

  test('Clicking plus on dirty new document prompts and can cancel reset', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await titleInput.fill('Draft Title');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially('Draft content body');

    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('drafttag');
    await tagInput.press('Enter');
    await expect(page.getByText('DRAFTTAG')).toBeVisible();

    await page.evaluate(() => {
      window.confirm = () => false;
    });

    await page.locator(`a[href="/hub/libraries/${libId}/documents/new"]`).first().click();

    await expect(titleInput).toHaveValue('Draft Title');
    await expect(page.getByText('DRAFTTAG')).toBeVisible();
    await expect(page.getByText('Draft content body')).toBeVisible();
    expect(page.url()).toContain('/documents/new');
  });

  test('Clicking plus on dirty new document confirms and clears draft', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await titleInput.fill('Draft Title');

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.pressSequentially('Draft content body');

    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('drafttag');
    await tagInput.press('Enter');
    await expect(page.getByText('DRAFTTAG')).toBeVisible();

    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await page.locator(`a[href="/hub/libraries/${libId}/documents/new"]`).first().click();

    await expect(titleInput).toHaveValue('');
    await expect(page.getByText('DRAFTTAG')).not.toBeVisible();
    await expect(page.getByText('Draft content body')).not.toBeVisible();
  });

  test('Clicking plus on clean new document clears without prompt', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      (window as Window & { __confirmCalls?: number }).__confirmCalls = 0;
      window.confirm = () => {
        (window as Window & { __confirmCalls?: number }).__confirmCalls =
          ((window as Window & { __confirmCalls?: number }).__confirmCalls || 0) + 1;
        return true;
      };
    });

    await page.locator(`a[href="/hub/libraries/${libId}/documents/new"]`).first().click();

    const confirmCalls = await page.evaluate(
      () => (window as Window & { __confirmCalls?: number }).__confirmCalls || 0
    );
    expect(confirmCalls).toBe(0);
    await expect(page.getByPlaceholder('Untitled Document')).toHaveValue('');
  });
});
