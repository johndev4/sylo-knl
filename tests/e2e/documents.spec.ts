import { test, expect } from '@playwright/test';
import { getTestData } from './utils/test-data';
import { randomUUID } from 'crypto';

test.describe.serial('Document Management', () => {
  let libId: string;
  let testDocName: string;
  let testDocId: string;

  test.beforeAll(() => {
    const testData = getTestData();
    libId = testData.testLibraryId;
    testDocName = `Integration Test Doc ${randomUUID()}`;
  });

  test('Shows inline unauthorized component on restricted library page', async ({
    page,
  }) => {
    // A random UUID that the user definitely doesn't have access to
    const unauthorizedLibId = '11111111-1111-1111-1111-111111111111';
    await page.goto(`/hub/libraries/${unauthorizedLibId}/documents`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(
      `/hub/libraries/${unauthorizedLibId}/documents`
    );
    await expect(
      page.getByRole('heading', { name: 'Unauthorized' })
    ).toBeVisible();
    await expect(
      page.getByText('You do not have permission to access this page.')
    ).toBeVisible();
  });

  test('Create a new document with all required fields', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(testDocName);

    const editor = page.locator('[contenteditable="true"]').first();
    await editor.waitFor({ state: 'visible' });
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

    // Listen for navigation after save to capture the new doc ID
    const [response] = await Promise.all([
      page.waitForNavigation(),
      saveBtn.click(),
    ]);

    // Extract the newly created document ID from the URL
    const url = page.url();
    const match = url.match(/\/documents\/([a-f0-9-]+)$/);
    expect(match).toBeTruthy();
    testDocId = match![1];
  });

  test('Show tag suggestions in new document flow after typing 3 characters', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('imp');

    await expect(
      page.getByRole('button', { name: 'IMPORTANT' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'IMPORTANT' }).click();
    await expect(page.getByText('IMPORTANT')).toBeVisible();
  });

  test('Show tag suggestions in edit document flow after typing 3 characters', async ({ page }) => {
    // Seed a different tag from the same library so suggestion list can appear
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    await page.evaluate(async (libraryId) => {
      await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Suggestion Seed Document',
          content: 'This document creates a tag suggestion source.',
          libraryId,
          tags: ['SuggestionSeed'],
        }),
      });
    }, libId);

    expect(testDocId).toBeDefined();
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit Mode' }).click();

    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('sug');

    await expect(
      page.getByRole('button', { name: 'SuggestionSeed' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'SuggestionSeed' }).click();
    await expect(page.getByText('SuggestionSeed')).toBeVisible();
  });

  test('List existing documents with filters in sidebar', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents`);
    await page.waitForLoadState('networkidle');

    // Verify empty state in main area initially
    await expect(
      page.getByRole('heading', { name: 'Select a Document' })
    ).toBeVisible();

    // Verify document appears in sidebar list
    await expect(
      page.locator('aside').getByText(testDocName.slice(0, 32))
    ).toBeVisible();

    // Search input in sidebar
    const searchInput = page.getByPlaceholder('Search docs...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Integration Test Doc');

    // Tag dropdown filter
    await expect(
      page
        .locator('[data-slot="select-trigger"]')
        .or(page.getByRole('combobox'))
        .first()
    ).toBeVisible();
  });

  test('Load More paginates through 1000 mocked documents (100 per load)', async ({
    page,
  }) => {
    const TOTAL_DOCS = 1000;
    const LIMIT = 100;

    /**
     * Build a page of mock document records.
     * Each document has a unique id, title, tags, and timestamps that match
     * the shape returned by GET /api/documents.
     */
    function buildPage(pageNum: number) {
      const from = (pageNum - 1) * LIMIT;
      const to = Math.min(from + LIMIT, TOTAL_DOCS);
      const data = Array.from({ length: to - from }, (_, i) => ({
        id: `mock-doc-${from + i + 1}`,
        title: `Mock Document ${from + i + 1}`,
        tags: ['MOCK'],
        author_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      }));
      return {
        data,
        metadata: {
          total: TOTAL_DOCS,
          page: pageNum,
          limit: LIMIT,
          totalPages: Math.ceil(TOTAL_DOCS / LIMIT),
        },
      };
    }

    // Intercept every GET /api/documents request and serve mock data.
    // Requests for the real library API are passed through so auth and
    // library metadata still work correctly.
    await page.route('**/api/documents*', async (route) => {
      const url = new URL(route.request().url());
      // Only mock GET requests (not POST/PUT/DELETE)
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      const pageNum = parseInt(url.searchParams.get('page') || '1');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildPage(pageNum)),
      });
    });

    await page.goto(`/hub/libraries/${libId}/documents`);
    await page.waitForLoadState('networkidle');

    // --- Initial page load: page=1 → 100 docs loaded, 900 remaining ---

    // Sidebar should show the total count label "DOCUMENTS (1000)"
    await expect(
      page.locator('aside').getByText('DOCUMENTS (1000)')
    ).toBeVisible({
      timeout: 10000,
    });

    // First mock document should appear immediately
    await expect(
      page.locator('aside').getByText('Mock Document 1', { exact: true })
    ).toBeVisible();

    // "Load More" button must be present showing 900 remaining
    const loadMoreBtn = page.locator('aside button', {
      hasText: /load more/i,
    });
    await expect(loadMoreBtn).toBeVisible();
    await expect(loadMoreBtn).toContainText('900 Left');

    // --- Load page 2: 100 more docs, 800 remaining ---
    await loadMoreBtn.click();
    await expect(loadMoreBtn).toContainText('800 Left');
    await expect(
      page.locator('aside').getByText('Mock Document 101', { exact: true })
    ).toBeVisible();

    // --- Load page 3: 100 more docs, 700 remaining ---
    await loadMoreBtn.click();
    await expect(loadMoreBtn).toContainText('700 Left');
    await expect(
      page.locator('aside').getByText('Mock Document 201', { exact: true })
    ).toBeVisible();

    // --- Exhaust all remaining pages (pages 4–10) ---
    for (let p = 4; p <= 10; p++) {
      await loadMoreBtn.click();
      const remaining = TOTAL_DOCS - p * LIMIT;
      if (remaining > 0) {
        await expect(loadMoreBtn).toContainText(`${remaining} Left`, {
          timeout: 10000,
        });
      }
    }

    // After all 10 pages loaded the "Load More" button should vanish
    await expect(loadMoreBtn).not.toBeVisible();

    // All 1000 docs are now rendered in the sidebar list
    await expect(
      page.locator('aside').getByText('Mock Document 1000', { exact: true })
    ).toBeVisible();
  });

  test('View document details', async ({ page }) => {
    expect(testDocId).toBeDefined();
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({});
    await expect(titleInput).toHaveValue(testDocName);

    await expect(page.getByRole('button', { name: 'Edit Mode' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible();
  });

  test('Switch to edit mode and update document', async ({ page }) => {
    expect(testDocId).toBeDefined();
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({});

    await page.getByRole('button', { name: 'Edit Mode' }).click();

    await expect(titleInput).toBeEnabled();
    const newName = `${testDocName} - Updated`;
    await titleInput.fill(newName);

    const saveBtn = page.getByRole('button', { name: 'Save' });
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toBeEnabled();

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes(`/api/documents/${testDocId}`) &&
          resp.request().method() === 'PUT'
      ),
      saveBtn.click(),
    ]);

    // Update our reference variable
    testDocName = newName;
  });

  test('Navigation guard prompts on unsaved changes', async ({ page }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const titleInput = page.getByPlaceholder('Untitled Document');
    await expect(titleInput).toBeVisible({});

    // Type something to make it dirty
    await titleInput.fill('Unsaved Doc');

    // Try to navigate back or click a link
    // We'll mock window.confirm to return false (don't leave)
    await page.evaluate(() => {
      window.confirm = () => false;
    });

    // Click library name in sidebar
    await page
      .locator('aside')
      .getByText(/Test Library|Mock Library/)
      .first()
      .click();

    // Check if we are still on the same page (URL hasn't changed)
    expect(page.url()).toContain('/documents/new');

    // Now mock confirm to return true (leave)
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    await page
      .locator('aside')
      .getByText(/Test Library|Mock Library/)
      .first()
      .click();
  });

  test('Clicking plus on dirty new document prompts and can cancel reset', async ({
    page,
  }) => {
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

    await page
      .locator(`a[href="/hub/libraries/${libId}/documents/new"]`)
      .first()
      .click();

    await expect(
      page.getByRole('heading', { name: 'Start a new document?' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Keep Editing' })).toBeVisible();

    await page.getByRole('button', { name: 'Keep Editing' }).click();

    await expect(titleInput).toHaveValue('Draft Title');
    await expect(page.getByText('DRAFTTAG')).toBeVisible();
    await expect(page.getByText('Draft content body')).toBeVisible();
    expect(page.url()).toContain('/documents/new');
  });

  test('Clicking plus on dirty new document confirms and clears draft', async ({
    page,
  }) => {
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

    await page
      .locator(`a[href="/hub/libraries/${libId}/documents/new"]`)
      .first()
      .click();

    await expect(
      page.getByRole('heading', { name: 'Start a new document?' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discard & Start New' })).toBeVisible();

    await page.getByRole('button', { name: 'Discard & Start New' }).click();

    await expect(titleInput).toHaveValue('');
    await expect(page.getByText('DRAFTTAG')).not.toBeVisible();
    await expect(page.getByText('Draft content body')).not.toBeVisible();
  });

  test('Clicking plus on clean new document clears without prompt', async ({
    page,
  }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    await page.evaluate(() => {
      (window as Window & { __confirmCalls?: number }).__confirmCalls = 0;
      window.confirm = () => {
        (window as Window & { __confirmCalls?: number }).__confirmCalls =
          ((window as Window & { __confirmCalls?: number }).__confirmCalls ||
            0) + 1;
        return true;
      };
    });

    await page
      .locator(`a[href="/hub/libraries/${libId}/documents/new"]`)
      .first()
      .click();

    const confirmCalls = await page.evaluate(
      () => (window as Window & { __confirmCalls?: number }).__confirmCalls || 0
    );
    expect(confirmCalls).toBe(0);
    await expect(page.getByPlaceholder('Untitled Document')).toHaveValue('');
  });

  test('Delete an existing document with confirmation', async ({ page }) => {
    expect(testDocId).toBeDefined();
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    // Verify delete button is visible (we are OWNER)
    const deleteBtn = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-trash2') });
    await expect(deleteBtn).toBeVisible({});

    await deleteBtn.click();

    // Verify AlertDialog title
    await expect(
      page.getByRole('heading', { name: 'Delete Document' })
    ).toBeVisible();
    await expect(
      page.getByText('Are you sure you want to delete')
    ).toBeVisible();

    const confirmBtn = page.getByRole('button', { name: 'Delete Document' });
    await expect(confirmBtn).toBeVisible();

    // Click confirm and wait for navigation
    await Promise.all([page.waitForNavigation(), confirmBtn.click()]);

    // Should redirect to library documents root
    await expect(page).toHaveURL(
      new RegExp(`/hub/libraries/${libId}/documents$`)
    );
  });
});
