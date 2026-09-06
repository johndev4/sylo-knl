import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 *  * Get the current authenticated user from the server.
 *
 * This function uses React's `cache` to ensure that the user is only fetched once per request,
 * even if this function is called multiple times. It redirects to the login page if the user
 * is not authenticated.
 *
 *
 * @returns A promise that resolves to the current user object.
 */
export async function getUser() {
  const user = await getUserNonRedirect();

  if (!user) {
    redirect('/login');
  }
  return user;
}

/**
 * Get the current authenticated user from the server without redirecting.
 *
 * This function is similar to `getUser`, but it does not redirect to the login page
 * if the user is not authenticated. Instead, it returns `null` in that case.
 *
 * @returns A promise that resolves to the current user object or null.
 */
export const getUserNonRedirect = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }
  return user;
});
