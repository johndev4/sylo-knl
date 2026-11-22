'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logging/logger';
import { getRequestId } from '@/lib/logging/request';

/**
 * Logs out the user by signing them out from Supabase and redirecting to the login page.
 *
 */
export async function logout() {
  const correlationId = getRequestId();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    logger.error('User logout failed', {
      correlationId,
      error,
    });
    throw error;
  }
  logger.info('User logout completed', { correlationId });

  revalidatePath('', 'layout');
}
