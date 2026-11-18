import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client.
 * Bypasses Row Level Security — use ONLY in trusted server-to-server routes
 * (e.g. internal cron workers). Never expose to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
