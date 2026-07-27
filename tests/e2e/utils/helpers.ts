import { Page } from '@playwright/test';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import fs from 'fs';

const testDataFile = 'tests/e2e/.auth/test-data.json';

/**
 * Handles test user authentication: fetches or creates user via service role,
 * or handles sign-up/sign-in using standard anon client.
 */
export async function getOrCreateTestUser(
  supabase: ReturnType<typeof createClient>,
  isServiceRole: boolean,
  email: string,
  password: string
): Promise<{ testUserId: string; authAccessToken?: string }> {
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
    return { testUserId: user.id };
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

      return { testUserId: signInData.user.id, authAccessToken: token };
    }

    throw new Error(signUpError.message);
  }

  // Handle successful new sign-up
  let token = signUpData.session?.access_token;
  let testUserId = signUpData.user?.id;

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
    testUserId = signInData.user?.id;
  }

  if (!testUserId) {
    throw new Error('Unable to obtain User ID.');
  }

  return { testUserId, authAccessToken: token };
}

/**
 * Clears previous test libraries associated with the test user to ensure idempotency.
 */
export async function cleanupPreviousLibraries(
  supabase: ReturnType<typeof createClient>,
  testUserId: string,
  isServiceRole: boolean
): Promise<void> {
  if (!isServiceRole) return;

  const { data: previousMemberships } = await supabase
    .from('library_members')
    .select('library_id')
    .eq('user_id', testUserId);

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
export async function createTestLibrary(
  supabase: ReturnType<typeof createClient>,
  name: string,
  testUserId: string,
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
        user_id: testUserId,
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
export function saveTestData(data: Record<string, unknown>) {
  fs.writeFileSync(testDataFile, JSON.stringify(data, null, 2));
}

/**
 * Instantiates a Supabase client using the appropriate key based on environment.
 */
export function getSupabaseClient(): {
  supabase: SupabaseClient;
  isServiceRole: boolean;
} {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error(
      'Supabase key is required for E2E tests. Set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return {
    supabase: createClient(supabaseUrl, supabaseKey),
    isServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

/**
 * Automates the UI login flow using Playwright page actions.
 */
export async function performUiLogin(
  page: Page,
  email: string,
  password: string,
  beforeLoginCallback?: () => Promise<unknown>,
  afterLoginCallback?: () => Promise<unknown>
): Promise<void> {
  //  Before login callback can be used to wait for specific navigation or actions pre-login
  if (beforeLoginCallback) {
    await beforeLoginCallback();
  }

  // Fill the email and password fields
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);

  // Submit the login form
  await page.locator('button[type="submit"]').click();

  // After login callback can be used to wait for specific navigation or actions post-login
  if (afterLoginCallback) {
    await afterLoginCallback();
  }
}
