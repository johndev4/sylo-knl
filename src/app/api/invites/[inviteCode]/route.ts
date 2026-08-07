import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !serviceKey) {
  throw new Error('Missing Supabase environment variables');
}

// We need a service role client to fetch invite details because RLS
// blocks anonymous users from viewing invites.
const supabaseAdmin = createClient(url, serviceKey);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const { inviteCode } = await context.params;

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    const { data: invite, error } = await supabaseAdmin
      .from('library_invites')
      .select('*, library:libraries(name)')
      .eq('invite_code', inviteCode)
      .single();

    if (error) {
      console.error('Failed to fetch invite details:', error);
      // Return 404 so we don't leak DB errors to public
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Determine if invite is valid
    const isExpired = invite.expires_at ? new Date(invite.expires_at) < new Date() : false;
    const isMaxed = invite.max_uses ? invite.use_count >= invite.max_uses : false;
    const isValid = invite.is_active && !isExpired && !isMaxed;

    // Return only safe details (no internal IDs)
    return NextResponse.json({
      data: {
        libraryName: invite.library?.name || 'Unknown Library',
        role: invite.role,
        isValid,
        isExpired,
        isMaxed,
        isActive: invite.is_active,
        inviteCode: invite.invite_code,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in GET /invites/[inviteCode]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
