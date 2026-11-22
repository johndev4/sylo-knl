'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logging/logger';
import { getRequestId } from '@/lib/logging/request';
import { AppError } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/errors/error-codes';
import { withActionErrorHandling } from '@/lib/errors/error-handler';

/**
 * Logs out the user by signing them out from Supabase and redirecting to the login page.
 *
 */
async function logoutImpl() {
  const correlationId = getRequestId();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
      cause: error,
    });
  }
  logger.info('User logout completed', { correlationId });

  revalidatePath('', 'layout');
}

export async function logout() {
  return withActionErrorHandling(logoutImpl, { action: 'logout' });
}
