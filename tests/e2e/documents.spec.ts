import { test, expect } from '@playwright/test';

// Use a valid UUID for routing to avoid Zod/Postgres errors
const libId = '00000000-0000-0000-0000-000000000000';

test.describe('Document Management', () => {
  // Setup: since we might not have a real seeded DB in CI, we mock the API responses for the documents endpoints.
  test.beforeEach(async ({ page }) => {
    // Mock user auth
    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        json: { id: 'test-user', email: 'test@example.com' }
      });
    });

    // Mock GET documents list
    await page.route('**/api/documents?*', async route => {
      await route.fulfill({
        status: 200,
        json: {
          data: [
            {
              id: 'doc-1',
              title: 'Mock Document 1',
              tags: ['test', 'mock'],
              author_ids: ['test-user'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ],
          metadata: { total: 1, page: 1, limit: 10, totalPages: 1 }
        }
      });
    });

    // Mock GET single document
    await page.route(`**/api/documents/*`, async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            document: {
              id: 'doc-1',
              title: 'Mock Document 1',
              content: '# Hello\nThis is a test.',
              tags: ['test', 'mock'],
              author_ids: ['test-user'],
              library_id: libId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              authors: [{ id: 'test-user', name: 'Test User' }]
            }
          }
        });
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          json: { success: true, document: { updated_at: new Date().toISOString() } }
        });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          json: { success: true }
        });
      } else {
        await route.continue();
      }
    });

    // Mock POST create document
    await page.route('**/api/documents', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          json: { success: true, documentId: 'new-doc-id' }
        });
      } else {
        await route.continue();
      }
    });
  });

  test('List existing documents with filters in sidebar', async ({ page }) => {
    // Navigate to documents section
    await page.goto(`/hub/${libId}/documents`);
    
    // Verify empty state in main area
    await expect(page.getByRole('heading', { name: 'Select a Document' })).toBeVisible();
    
    // Verify document in sidebar list
    const sidebar = page.locator('aside, .transition-all'); // sidebar container
    await expect(page.getByText('Mock Document 1')).toBeVisible();
    
    // Test search filter input in sidebar
    const searchInput = page.getByPlaceholder('Search docs...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Mock Search');
    // Sidebar filters automatically or on input change in the new implementation (via useMemo)
  });

  test('Create a new document with all required fields', async ({ page }) => {
    await page.goto(`/hub/${libId}/documents/new`);
    
    // Verify we are on the new document page (title input should be visible)
    await expect(page.getByLabel('Document Title')).toBeVisible();
    
    // Fill title
    await page.getByLabel('Document Title').fill('My New Document');
    
    // Fill content in Novel (which uses ProseMirror)
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.fill('This is the content of my new document.');
    
    // Add tag
    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('important');
    await tagInput.press('Enter');
    
    // Submit
    const submitBtn = page.getByRole('button', { name: 'Save' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
  });

  test('Create a new document with optional fields (no tags)', async ({ page }) => {
    await page.goto(`/hub/${libId}/documents/new`);
    
    // Fill title
    await page.getByLabel('Document Title').fill('Minimal Document');
    
    // Fill content
    const editor = page.locator('.ProseMirror');
    await editor.click();
    await editor.fill('Just the basics.');
    
    // Submit directly
    await page.getByRole('button', { name: 'Save' }).click();
  });

  test('View document details', async ({ page }) => {
    await page.goto(`/hub/${libId}/documents/doc-1`);
    
    // Verify details
    await expect(page.getByRole('heading', { name: 'Mock Document 1' })).toBeVisible();
    
    // Content is rendered (ReactMarkdown via MarkdownViewer)
    await expect(page.getByText('This is a test.')).toBeVisible();
  });

  test('Edit document details', async ({ page }) => {
    await page.goto(`/hub/${libId}/documents/doc-1/edit`);
    
    // Form should be populated
    await expect(page.getByLabel('Document Title')).toHaveValue('Mock Document 1');
    
    // Edit title
    await page.getByLabel('Document Title').fill('Updated Document Title');
    
    // Save
    await page.getByRole('button', { name: 'Save' }).click();
  });

  // Note: Delete functionality in sidebar is not yet implemented in this iteration
  // as the mockup didn't show it. We can add it to the detail view later.
});
