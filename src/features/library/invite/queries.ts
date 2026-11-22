import { createClient } from '@supabase/supabase-js';
import {
  inviteDetailsSchema,
  inviteCodeSchema,
} from '@/features/library/invite/invite-schema';
import { logger } from '@/lib/logging/logger';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(url, serviceKey);

export async function getInviteDetails(rawInviteCode: string) {
  try {
    // 1. Validate Input
    const inputParsed = inviteCodeSchema.safeParse(rawInviteCode);
    if (!inputParsed.success) {
      return { error: 'This invite link is invalid.' };
    }

    const inviteCode = inputParsed.data;

    // 2. Fetch Data
    const { data: invite, error } = await supabaseAdmin
      .from('library_invites')
      .select('*, library:libraries(name)')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !invite) {
      if (error && error.code !== 'PGRST116') {
        logger.error('Invite details query failed', { error });
        return { error: 'Unable to load this invite. Please try again.' };
      }
      return { error: 'Invite not found' };
    }

    // 3. Compute flags
    const isExpired = invite.expires_at
      ? new Date(invite.expires_at) < new Date()
      : false;
    const isMaxed = invite.max_uses
      ? invite.use_count >= invite.max_uses
      : false;
    const isValid = invite.is_active && !isExpired && !isMaxed;

    // 4. Validate Output
    const outputParsed = inviteDetailsSchema.safeParse({
      libraryName: invite.library?.name || 'Unknown Library',
      role: invite.role,
      isValid,
      isExpired,
      isMaxed,
      isActive: invite.is_active,
      inviteCode: invite.invite_code,
    });

    if (!outputParsed.success) {
      logger.error('Invite details output validation failed', {
        issueCount: outputParsed.error.issues.length,
      });
      return { error: 'Invalid data format returned' };
    }

    return { data: outputParsed.data };
  } catch (error: unknown) {
    logger.error('Invite details request failed unexpectedly', { error });
    return { error: 'Internal server error' };
  }
}
