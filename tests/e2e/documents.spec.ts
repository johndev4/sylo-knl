import { test, expect } from '@playwright/test';
import { getTestData } from './utils/test-data';
import { randomUUID } from 'crypto';
import { mockSupabaseDocuments } from './utils/helpers';

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
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('This page could not be found.')).toBeVisible();
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

  test('Show tag suggestions in new document flow after typing 3 characters', async ({
    page,
  }) => {
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');

    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('imp');

    await expect(page.getByText('IMPORTANT', { exact: true })).toBeVisible();

    await page.getByText('IMPORTANT', { exact: true }).click();
    await expect(page.getByText('IMPORTANT', { exact: true })).toBeVisible();
  });

  test('Show tag suggestions in edit document flow after typing 3 characters', async ({
    page,
  }) => {
    // Create a new document with a different tag from the same library so suggestion list can appear
    await page.goto(`/hub/libraries/${libId}/documents/new`);
    await page.waitForLoadState('networkidle');
    const suggestionTitleInput = page.getByPlaceholder('Untitled Document');
    await expect(suggestionTitleInput).toBeVisible();
    await suggestionTitleInput.fill('Suggestion Seed Document');
    const suggestionEditor = page.locator('[contenteditable="true"]').first();
    await suggestionEditor.waitFor({ state: 'visible' });
    await suggestionEditor.click();
    await suggestionEditor.pressSequentially(
      'This document creates a tag suggestion source.'
    );
    const suggestionTagInput = page.getByPlaceholder('Add tag...');
    await suggestionTagInput.fill('suggestion seed');
    await suggestionTagInput.press('Enter');
    const suggestionSaveBtn = page.getByRole('button', { name: 'Save' });
    await expect(suggestionSaveBtn).toBeEnabled();
    await Promise.all([page.waitForLoadState(), suggestionSaveBtn.click()]);

    expect(testDocId).toBeDefined();
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Edit Mode' }).click();

    const tagInput = page.getByPlaceholder('Add tag...');
    await tagInput.fill('sug');

    await expect(
      page.getByText('SUGGESTION SEED', { exact: true })
    ).toBeVisible();

    await page.getByText('SUGGESTION SEED', { exact: true }).click();
    await expect(
      page.getByText('SUGGESTION SEED', { exact: true })
    ).toBeVisible();
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
      page
        .locator('div[aria-label="Sidebar Document List Content"]')
        .getByText(testDocName.slice(0, 32))
    ).toBeVisible();

    // Search input in sidebar
    const searchInput = page.getByPlaceholder('Search docs…');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Integration Test Doc');

    // Tag filter popover trigger button
    await expect(
      page.getByRole('button', { name: /filter tags/i })
    ).toBeVisible();
  });

  /* Temporarily remove the 1000 mocked documents for E2E test. Fix this soon. */
  test('Load More paginates through 1000 mocked documents (100 per load)', async ({
    page,
  }) => {
    const TOTAL_DOCS = 1000;
    const LIMIT = 100;

    await mockSupabaseDocuments(page, 1000, 100);

    await page.goto(`/hub/libraries/${libId}/documents`);
    await page.waitForLoadState('networkidle');

    // --- Initial page load: page=1 → 100 docs loaded, 900 remaining ---

    // Sidebar should show the total count label "DOCUMENTS (1000)"
    await expect(
      page
        .locator('div[aria-label="Sidebar Document List Content"]')
        .getByText('DOCUMENTS (1000)')
    ).toBeVisible({
      timeout: 10000,
    });

    // First mock document should appear immediately
    await expect(
      page
        .locator('div[aria-label="Sidebar Document List Content"]')
        .getByText('Mock Document 1', { exact: true })
    ).toBeVisible();

    // Helper to scroll the virtualized ScrollArea viewport to the bottom
    const scrollViewport = page.locator('[data-slot="scroll-area-viewport"]');
    const scrollToBottom = async () => {
      await scrollViewport.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(100);
    };

    // Scroll to bottom so TanStack Virtual renders the "Load More" button row
    await scrollToBottom();

    // "Load More" button must be present showing 900 remaining
    const loadMoreBtn = page.locator(
      'div[aria-label="Sidebar Document List Content"] button',
      {
        hasText: /load more/i,
      }
    );
    await expect(loadMoreBtn).toBeVisible();
    await expect(loadMoreBtn).toContainText('900 Left');

    // --- Load page 2: 100 more docs, 800 remaining ---
    // Right after clicking, current scroll position (y~6000) shows Mock Document 101 (index 100)
    await loadMoreBtn.click();
    await expect(
      page
        .locator('div[aria-label="Sidebar Document List Content"]')
        .getByText('Mock Document 101', { exact: true })
    ).toBeVisible();
    await scrollToBottom();
    await expect(loadMoreBtn).toContainText('800 Left');

    // --- Load page 3: 100 more docs, 700 remaining ---
    // Right after clicking, current scroll position (y~12000) shows Mock Document 201 (index 200)
    await loadMoreBtn.click();
    await expect(
      page
        .locator('div[aria-label="Sidebar Document List Content"]')
        .getByText('Mock Document 201', { exact: true })
    ).toBeVisible();
    await scrollToBottom();
    await expect(loadMoreBtn).toContainText('700 Left');

    // --- Exhaust all remaining pages (pages 4–10) ---
    for (let p = 4; p <= 10; p++) {
      await loadMoreBtn.click();
      await scrollToBottom();
      const remaining = TOTAL_DOCS - p * LIMIT;
      if (remaining > 0) {
        await expect(loadMoreBtn).toContainText(`${remaining} Left`, {
          timeout: 10000,
        });
      }
    }

    // After all 10 pages loaded the "Load More" button should vanish
    await expect(loadMoreBtn).not.toBeVisible();

    // All 1000 docs are now loaded and since we scrolled to bottom, Mock Document 1000 is rendered
    await expect(
      page
        .locator('div[aria-label="Sidebar Document List Content"]')
        .getByText('Mock Document 1000', { exact: true })
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

    await saveBtn.click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Edit Mode' })).toBeVisible();

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
      .locator('div[aria-label="Sidebar Document List Content"]')
      .getByLabel('New Document', { exact: true })
      .first()
      .click();

    // Check if we are still on the same page (URL hasn't changed)
    expect(page.url()).toContain('/documents/new');

    // Now mock confirm to return true (leave)
    await page.getByRole('button', { name: 'Discard & Start New' }).click();
    // await page.evaluate(() => {
    //   window.confirm = () => true;
    // });

    await page
      .locator('div[aria-label="Sidebar Document List Content"]')
      .getByLabel('New Document', { exact: true })
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
    await expect(
      page.getByRole('button', { name: 'Keep Editing' })
    ).toBeVisible();

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
    await expect(
      page.getByRole('button', { name: 'Discard & Start New' })
    ).toBeVisible();

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

  test('Document management remains usable on mobile', async ({ page }) => {
    expect(testDocId).toBeDefined();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    const sidebarTrigger = page.getByRole('button', {
      name: 'Toggle Sidebar',
    });
    await expect(sidebarTrigger).toBeVisible();
    const sidebarTriggerBox = await sidebarTrigger.boundingBox();
    expect(sidebarTriggerBox?.height).toBeGreaterThanOrEqual(44);

    await sidebarTrigger.click();
    const searchInput = page.getByRole('textbox', {
      name: 'Search documents',
    });
    await expect(searchInput).toBeVisible();
    const searchBox = await searchInput.boundingBox();
    expect(searchBox?.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Escape');

    const switchLibraryButton = page.getByRole('button', {
      name: 'Switch library',
    });
    await expect(switchLibraryButton).toBeVisible();
    const switchLibraryBox = await switchLibraryButton.boundingBox();
    expect(switchLibraryBox?.height).toBeGreaterThanOrEqual(44);

    const editButton = page.getByRole('button', { name: 'Edit document' });
    await expect(editButton).toBeVisible();
    const editBox = await editButton.boundingBox();
    expect(editBox?.height).toBeGreaterThanOrEqual(44);
    await editButton.click();

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    const cancelButton = page.getByRole('button', {
      name: 'Cancel editing',
    });
    await expect(saveButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
    const saveBox = await saveButton.boundingBox();
    const cancelBox = await cancelButton.boundingBox();
    expect(saveBox?.height).toBeGreaterThanOrEqual(44);
    expect(cancelBox?.height).toBeGreaterThanOrEqual(44);

    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).resolves.toBe(true);
  });

  test('Delete an existing document with confirmation', async ({ page }) => {
    expect(testDocId).toBeDefined();
    await page.goto(`/hub/libraries/${libId}/documents/${testDocId}`);
    await page.waitForLoadState('networkidle');

    // Verify delete button is visible (we are OWNER)
    const deleteBtn = page.locator(
      'button[aria-label="Delete document"]:visible'
    );
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
