import { test as setup, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const authFile = 'tests/e2e/.auth/user.json';
const testDataFile = 'tests/e2e/.auth/test-data.json';

setup('authenticate and seed', async ({ page }) => {
  // Ensure the .auth directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  // 1. Initialize Supabase client and check key type
  const { supabase, isServiceRole } = getSupabaseClient();

  // 2. Retrieve or create the test user
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
  if (!testEmail || !testPassword) {
    throw new Error(
      'PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD environment variables are required in .env.test'
    );
  }
  const { userId, authAccessToken } = await getOrCreateTestUser(
    supabase,
    isServiceRole,
    testEmail,
    testPassword
  );
  expect(userId).toBeTruthy();

  if (!isServiceRole && !authAccessToken) {
    throw new Error(
      'Unable to create libraries because no authenticated access token was obtained.'
    );
  }

  // 3. Clear previous test libraries if using service role to prevent test-run clutter
  await cleanupPreviousLibraries(supabase, userId, isServiceRole);

  // 4. Create first test library
  const libName = `Test Library ${Date.now()}`;
  const libData = await createTestLibrary(
    supabase,
    libName,
    userId,
    isServiceRole
  );
  expect(libData?.id).toBeTruthy();

  // 5. Create second test library
  const libName2 = `Mock Library 2 ${Date.now()}`;
  const libData2 = await createTestLibrary(
    supabase,
    libName2,
    userId,
    isServiceRole
  );
  expect(libData2?.id).toBeTruthy();

  // 6. Save the test data details to disk for specs to consume
  saveTestData({
    userId,
    testLibraryId: libData.id,
    testLibraryId2: libData2.id,
    testLibraryName: libName,
    testLibraryName2: libName2,
    testEmail,
    testPassword,
  });

  // 7. Perform browser login flow and preserve browser state (cookies/session storage)
  await performUiLogin(page, testEmail, testPassword);

  // 8. Save the authenticated browser state
  await page.context().storageState({ path: authFile });
});

/**
 * Validates environment variables and initializes the Supabase client.
 */
function getSupabaseClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

  // Attempt to use service role if available, otherwise fallback to anon key
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      'Supabase key is required for E2E tests. Set SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const isServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return { supabase, isServiceRole };
}

/**
 * Handles test user authentication: fetches or creates user via service role,
 * or handles sign-up/sign-in using standard anon client.
 */
async function getOrCreateTestUser(
  supabase: ReturnType<typeof createClient>,
  isServiceRole: boolean,
  email: string,
  password: string
): Promise<{ userId: string; authAccessToken?: string }> {
  if (isServiceRole) {
    const { data: listData } = await supabase.auth.admin.listUsers();
    let user = listData?.users.find((u) => u.email === email);

    if (!user) {
      const { data } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      user = data.user!;
    }
    return { userId: user.id };
  }

  // Fallback using anon key (works well on local Supabase since email_confirm is off by default)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    const normalizedMessage = signUpError.message.toLowerCase();
    const shouldFallbackToSignIn =
      normalizedMessage.includes('already registered') ||
      normalizedMessage.includes('rate limit');

    if (shouldFallbackToSignIn) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        throw new Error(
          `Could not sign in after signup fallback: ${signInError.message}`
        );
      }

      const token = signInData.session?.access_token;
      if (token && signInData.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: token,
          refresh_token: signInData.session.refresh_token,
        });
      }

      if (!signInData.user?.id) {
        throw new Error(
          'Supabase authentication failed to return user ID after sign-in.'
        );
      }

      return { userId: signInData.user.id, authAccessToken: token };
    }

    throw new Error(signUpError.message);
  }

  // Handle successful new sign-up
  let token = signUpData.session?.access_token;
  let userId = signUpData.user?.id;

  if (token && signUpData.session?.refresh_token) {
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: signUpData.session.refresh_token,
    });
  } else {
    // If sign-up didn't auto-establish session, sign in explicitly
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      throw new Error(signInError.message);
    }

    if (
      !signInData.session?.access_token ||
      !signInData.session.refresh_token
    ) {
      throw new Error(
        'Unable to establish Supabase auth session after sign-up.'
      );
    }

    token = signInData.session.access_token;
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: signInData.session.refresh_token,
    });
    userId = signInData.user?.id;
  }

  if (!userId) {
    throw new Error('Unable to obtain User ID.');
  }

  return { userId, authAccessToken: token };
}

/**
 * Clears previous test libraries associated with the test user to ensure idempotency.
 */
async function cleanupPreviousLibraries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  isServiceRole: boolean
): Promise<void> {
  if (!isServiceRole) return;

  const { data: previousMemberships } = await supabase
    .from('library_members')
    .select('library_id')
    .eq('user_id', userId);

  const previousLibraryIds =
    previousMemberships?.map((member) => member.library_id) ?? [];

  if (previousLibraryIds.length > 0) {
    await supabase.from('libraries').delete().in('id', previousLibraryIds);
  }
}

/**
 * Creates a library and establishes its ownership (using either administrative inserts
 * or custom RPC functions depending on privileges).
 */
async function createTestLibrary(
  supabase: ReturnType<typeof createClient>,
  name: string,
  userId: string,
  isServiceRole: boolean
) {
  if (isServiceRole) {
    const { data: libData, error: libError } = await supabase
      .from('libraries')
      .insert({ name })
      .select()
      .single();

    if (libError || !libData) {
      throw new Error(
        `Failed to create library as admin: ${libError?.message || 'No data returned'}`
      );
    }

    // Set Owner role since service role bypasses user defaults/triggers
    const { error: memberError } = await supabase
      .from('library_members')
      .insert({
        library_id: libData.id,
        user_id: userId,
        role: 'OWNER',
      });

    if (memberError) {
      throw new Error(
        `Failed to create owner library membership: ${memberError.message}`
      );
    }

    return libData;
  }

  // Create via user RPC function when using standard user permissions
  const { data: libData, error: rpcError } = await supabase
    .rpc('create_library_with_owner', { w_name: name })
    .single();

  if (rpcError || !libData) {
    throw new Error(
      `Failed to create library via RPC: ${rpcError?.message || 'No data returned'}`
    );
  }

  return libData;
}

/**
 * Persists seed configuration parameters to the local JSON file.
 */
function saveTestData(data: Record<string, unknown>) {
  fs.writeFileSync(testDataFile, JSON.stringify(data, null, 2));
}

/**
 * Automates the UI login flow using Playwright page actions.
 */
async function performUiLogin(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');

  // Fill the email and password fields
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Submit the login form
  await page.locator('button[type="submit"]').click();

  // Wait until the page routes successfully to the dashboard hub
  await page.waitForURL('**/hub');
}
