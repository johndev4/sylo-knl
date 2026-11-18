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
    const selector = page.getByRole('button', {
      name: /Select librar|All libraries|libraries/i,
    });
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

    const selector = page.getByRole('button', {
      name: /Select librar|All libraries|libraries/i,
    });
    await selector.click();

    // Command palette/Popover should be visible
    const popover = page.locator('[role="dialog"]');
    await expect(popover).toBeVisible();
    await expect(
      popover.locator('input[placeholder="Search libraries…"]')
    ).toBeVisible();
  });

  test('Document and tag mentions are sent as retrieval scope', async ({
    page,
  }) => {
    const documentId = '00000000-0000-4000-8000-000000000123';
    await page.route('**/rest/v1/documents**', async (route) => {
      const url = new URL(route.request().url());
      const data = url.searchParams.get('select')?.includes('title')
        ? [
            {
              id: documentId,
              title: 'Threat Model',
              library_id: testData.testLibraryId,
            },
          ]
        : [{ tags: ['SECURITY'] }];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });

    let chatRequestBody: Record<string, unknown> | undefined;
    await page.route('**/api/chat', async (route) => {
      chatRequestBody = route.request().postDataJSON() as Record<
        string,
        unknown
      >;
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: 'Retrieved answer',
      });
    });

    await page.goto(`/chat?libraryIds=${testData.testLibraryId}`);
    const messageInput = page.getByRole('textbox', { name: 'Message' });
    await expect(messageInput).toBeVisible();

    await messageInput.fill('@Threat');
    await page.getByRole('option', { name: /Threat Model/ }).click();
    await expect(
      page.getByText('@Threat Model', { exact: true })
    ).toBeVisible();

    await messageInput.fill('#sec');
    await page.getByRole('option', { name: /SECURITY/ }).click();
    await expect(page.getByText('#SECURITY', { exact: true })).toBeVisible();

    await messageInput.fill('Summarize this reference');
    await messageInput.press('Enter');

    await expect(page.getByText('Retrieved answer')).toBeVisible();
    await expect
      .poll(() => chatRequestBody)
      .toMatchObject({
        libraryIds: [testData.testLibraryId],
        mentionScope: {
          documentIds: [documentId],
          tags: ['SECURITY'],
        },
      });
  });

  test('Rejects a document mention outside the available documents', async ({
    page,
  }) => {
    await page.goto(`/chat?libraryIds=${testData.testLibraryId}`);
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();

    const response = await page.evaluate(async (libraryId) => {
      const result = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Summarize this document' }],
          libraryIds: [libraryId],
          mentionScope: {
            documentIds: ['00000000-0000-4000-8000-000000000124'],
            tags: [],
          },
        }),
      });
      return result.status;
    }, testData.testLibraryId);

    expect(response).toBe(403);
  });
});
