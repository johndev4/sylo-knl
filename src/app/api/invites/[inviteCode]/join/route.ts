import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
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

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call the RPC function to join library via invite
    // The RPC will handle validations, limits, and decrementing/updating the invite atomically
    const { data, error } = await supabase.rpc('join_library_via_invite', {
      p_invite_code: inviteCode,
    });

    if (error) {
      console.error('Failed to join library via invite:', error);
      
      // Parse common error messages from the RPC
      const msg = error.message || '';
      let status = 400;
      
      if (msg.includes('Unauthorized')) status = 401;
      else if (msg.includes('Invite not found')) status = 404;
      else if (msg.includes('already a member')) status = 409;
      else if (msg.includes('limit')) status = 409; // Handles 11 member or 5 shared libs limits

      return NextResponse.json(
        { error: error.message || 'Failed to join library' },
        { status }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error) {
    console.error('Error in POST /invites/[inviteCode]/join:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
