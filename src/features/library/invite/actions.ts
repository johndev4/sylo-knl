'use server';

import { createClient } from '@/lib/supabase/server';
import {
  joinInviteInputSchema,
  joinInviteOutputSchema,
  JoinInviteResult,
} from '@/features/library/invite/invite-schema';
import { getUser } from '@/lib/auth/get-user';

export async function joinLibraryAction(
  rawInviteCode: string
): Promise<JoinInviteResult> {
  try {
    // 1. Validate Input
    const inputParsed = joinInviteInputSchema.safeParse(rawInviteCode);
    if (!inputParsed.success) {
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
      console.error('Failed to join library via invite:', error);
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
      console.error('Output validation failed:', outputParsed.error);
      return { success: false, error: 'Invalid data format returned' };
    }

    return { success: true, data: outputParsed.data.data };
  } catch (error) {
    console.error('Error in joinLibraryAction:', error);
    return { success: false, error: 'Internal server error' };
  }
}
