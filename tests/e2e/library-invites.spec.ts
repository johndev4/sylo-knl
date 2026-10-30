import { test, expect } from '@playwright/test';
import { getTestData } from './utils/test-data';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient, performUiLogin } from './utils/helpers';

test.describe.serial('Library Invites', () => {
  let testData: ReturnType<typeof getTestData>;
  let supabaseAdmin: SupabaseClient;

  test.beforeAll(async () => {
    testData = getTestData();
    ({ supabase: supabaseAdmin } = getSupabaseClient());

    // Clean up invites for this library before each test
    await supabaseAdmin
      .from('library_invites')
      .delete()
      .eq('library_id', testData.testLibraryId);

    // Ensure user2 is not a member of the library before the test
    await supabaseAdmin
      .from('library_members')
      .delete()
      .eq('library_id', testData.testLibraryId)
      .eq('user_id', testData.testUser2Id);
  });

  test('owner can generate an invite link and see it in the active invites table', async ({
    page,
  }) => {
    await page.goto(`/hub/libraries/${testData.testLibraryId}/info/members`);
    await page.waitForLoadState('networkidle');

    // Navigate to settings and look for Invite Links section
    await expect(
      page.getByRole('heading', { name: 'Invite Links' })
    ).toBeVisible();

    // Create a new invite
    await page.getByLabel('Invite member role', { exact: true }).click();
    await page
      .getByRole('menuitem', { name: 'Editor - Can create and edit content' })
      .click();
    await page.getByRole('button', { name: 'Generate Invite Link' }).click();

    // Verify success message
    await expect(page.getByText('Invite created successfully')).toBeVisible();

    // Verify invite appears in the table
    const table = page
      .getByLabel('Active Invites section', { exact: true })
      .locator('table');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(1);
    await expect(table.locator('td').nth(1)).toContainText('EDITOR');
  });

  test('member and invite management is usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/hub/libraries/${testData.testLibraryId}/info/members`);
    await page.waitForLoadState('networkidle');

    const memberList = page.getByRole('list', { name: 'Library members' });
    const inviteList = page.getByRole('list', {
      name: 'Active invite links',
    });
    await expect(memberList).toBeVisible();
    await expect(inviteList).toBeVisible();

    const copyButton = inviteList.getByRole('button', {
      name: 'Copy',
      exact: true,
    });
    const revokeButton = inviteList.getByRole('button', {
      name: 'Revoke',
      exact: true,
    });
    await expect(copyButton).toBeVisible();
    await expect(revokeButton).toBeVisible();
    expect((await copyButton.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await revokeButton.boundingBox())?.height).toBeGreaterThanOrEqual(
      44
    );
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    ).resolves.toBe(true);
  });

  test('second user can accept an invite link and is added as a member with the correct role', async ({
    page,
    context,
    browser,
  }) => {
    await page.goto(`/hub/libraries/${testData.testLibraryId}/info/members`);
    await page.waitForLoadState('networkidle');

    // Grant clipboard read permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Copy the invite link
    const table = page.getByLabel('Active Invites section', { exact: true });
    const copyButton = table.locator('button:visible', { hasText: 'Copy' });
    await copyButton.click();

    // Retrieve the copied invite link from the clipboard and extract the pathname
    const inviteLinkPathname = await page.evaluate(() => {
      const fullUrl = navigator.clipboard.readText();
      return fullUrl.then((url) => new URL(url).pathname);
    });

    // Verify that the invite link is in the expected format
    expect(inviteLinkPathname).toContain('/join/');

    // Create a new browser context without authentication for the second user
    const user2Context = await browser.newContext({ storageState: undefined });

    // Navigate to the invite link in a new context (unauthenticated)
    const user2Page = await user2Context.newPage();
    await user2Page.goto(`${inviteLinkPathname}`);

    // Perform sign-in for the second user
    await performUiLogin(
      user2Page,
      testData.testUser2Email,
      testData.testUser2Password,
      async () =>
        await user2Page
          .getByRole('button', { name: 'Sign In to Join', exact: true })
          .click(),
      async () => await user2Page.waitForURL(`${inviteLinkPathname}`)
    );

    // Accept the invite
    await user2Page.getByRole('button', { name: 'Accept Invite' }).click();
    await user2Page.waitForURL(
      `hub/libraries/${testData.testLibraryId}/documents`
    );

    // Verify that the second user is now a member of the library with the correct role
    await page.goto(`/hub/libraries/${testData.testLibraryId}/info/members`);
    const user2Row = page.locator('tr', { hasText: testData.testUser2Email });
    await expect(user2Row).toBeVisible();
    await expect(user2Row.locator('td', { hasText: 'EDITOR' })).toBeVisible();
  });

  test('members can be selected for bulk removal on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/hub/libraries/${testData.testLibraryId}/info/members`);
    await page.waitForLoadState('networkidle');

    const memberList = page.getByRole('list', { name: 'Library members' });
    const invitedMember = memberList
      .getByRole('listitem')
      .filter({ hasText: testData.testUser2Email });
    const selectMember = invitedMember.getByRole('checkbox');
    await expect(selectMember).toBeVisible();
    await expect(selectMember).toBeEnabled();
    await selectMember.click();
    await expect(
      page.getByRole('button', { name: 'Remove 1 member(s)' })
    ).toBeVisible();
  });
});
