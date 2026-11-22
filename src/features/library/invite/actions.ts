'use server';

import { createClient } from '@/lib/supabase/server';
import {
  joinInviteInputSchema,
  joinInviteOutputSchema,
  JoinInviteResult,
} from '@/features/library/invite/invite-schema';
import { getUser } from '@/lib/auth/get-user';
import { logger } from '@/lib/logging/logger';
import { getRequestId } from '@/lib/logging/request';

export async function joinLibraryAction(
  rawInviteCode: string
): Promise<JoinInviteResult> {
  const correlationId = getRequestId();
  try {
    // 1. Validate Input
    const inputParsed = joinInviteInputSchema.safeParse(rawInviteCode);
    if (!inputParsed.success) {
      logger.warn('Library invite validation failed', {
        correlationId,
        statusCode: 400,
      });
      return { success: false, error: inputParsed.error.message };
    }

    const inviteCode = inputParsed.data;

    // 2. Auth Check
    const supabase = await createClient();
    await getUser();

    // 3. RPC Call
    const { data, error } = await supabase.rpc('join_library_via_invite', {
      p_invite_code: inviteCode,
    });

    if (error) {
      logger.error('Library invite join failed', {
        correlationId,
        error,
      });
      return {
        success: false,
        error: error.message || 'Failed to join library',
      };
    }

    // 4. Validate Output
    const outputParsed = joinInviteOutputSchema.safeParse({
      success: true,
      data,
    });
    if (!outputParsed.success) {
      logger.error('Library invite join output validation failed', {
        correlationId,
        error: outputParsed.error,
      });
      return { success: false, error: 'Invalid data format returned' };
    }

    return { success: true, data: outputParsed.data.data };
  } catch (error) {
    logger.error('Library invite join unexpected failure', {
      correlationId,
      error,
    });
    return { success: false, error: 'Internal server error' };
  }
}
