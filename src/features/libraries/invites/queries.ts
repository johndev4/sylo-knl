import { createClient } from '@supabase/supabase-js';
import {
  inviteDetailsSchema,
  inviteCodeSchema,
} from '@/features/libraries/invites/invite-schema';

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
      return { error: inputParsed.error.message };
    }

    const inviteCode = inputParsed.data;

    // 2. Fetch Data
    const { data: invite, error } = await supabaseAdmin
      .from('library_invites')
      .select('*, library:libraries(name)')
      .eq('invite_code', inviteCode)
      .single();

    if (error || !invite) {
      console.error('Failed to fetch invite details:', error);
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
      console.error('Output validation failed:', outputParsed.error);
      return { error: 'Invalid data format returned' };
    }

    return { data: outputParsed.data };
  } catch (error) {
    console.error('Error fetching invite:', error);
    return { error: 'Internal server error' };
  }
}
