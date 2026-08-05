import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  cleanupPreviousLibraries,
  createTestLibrary,
  getOrCreateTestUser,
  getSupabaseClient,
  performUiLogin,
  saveTestData,
} from '../utils/helpers';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate and seed', async ({ page }) => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // 1. Initialize Supabase client and check key type
  const { supabase, isServiceRole } = getSupabaseClient();

  // 2. Retrieve or create the first test user
  const testUserEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testUserPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!testUserEmail || !testUserPassword) {
    throw new Error(
      'PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD environment variables are required in .env.test'
    );
  }
  const { testUserId, authAccessToken } = await getOrCreateTestUser(
    supabase,
    isServiceRole,
    testUserEmail,
    testUserPassword
  );
  expect(testUserId).toBeTruthy();

  if (!isServiceRole && !authAccessToken) {
    throw new Error(
      'Unable to create libraries because no authenticated access token was obtained.'
    );
  }

  // 3. Clear previous test libraries if using service role to prevent test-run clutter
  await cleanupPreviousLibraries(supabase, testUserId, isServiceRole);

  // 4. Create first test library
  const libName = `Test Library ${Date.now()}`;
  const libData = await createTestLibrary(
    supabase,
    libName,
    testUserId,
    isServiceRole
  );
  expect(libData?.id).toBeTruthy();

  // 5. Create second test library
  const libName2 = `Mock Library 2 ${Date.now()}`;
  const libData2 = await createTestLibrary(
    supabase,
    libName2,
    testUserId,
    isServiceRole
  );
  expect(libData2?.id).toBeTruthy();

  // 6. Retrieve or create the 2nd test user
  const testUser2Email = process.env.PLAYWRIGHT_2ND_TEST_EMAIL;
  const testUser2Password = process.env.PLAYWRIGHT_2ND_TEST_PASSWORD;
  const { testUserId: testUser2Id } = await getOrCreateTestUser(
    supabase,
    isServiceRole,
    testUser2Email,
    testUser2Password
  );
  expect(testUser2Id).toBeTruthy();

  // 7. Save the test data details to disk for specs to consume
  saveTestData({
    testUserId,
    testUserEmail,
    testUserPassword,
    testUser2Id,
    testUser2Email,
    testUser2Password,
    testLibraryId: libData.id,
    testLibraryId2: libData2.id,
    testLibraryName: libName,
    testLibraryName2: libName2,
  });

  // 8. Perform browser login flow and preserve browser state (cookies/session storage)
  await performUiLogin(
    page,
    testUserEmail,
    testUserPassword,
    async () => await page.goto('/login'),
    async () => await page.waitForURL('**/hub')
  );

  // 9. Save the authenticated browser state
  await page.context().storageState({ path: authFile });
});
