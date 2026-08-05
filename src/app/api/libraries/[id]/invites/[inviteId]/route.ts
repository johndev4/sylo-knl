import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { id: libraryId, inviteId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is OWNER or ADMIN of library
    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can revoke invites' },
        { status: 403 }
      );
    }

    // Update invite to be inactive
    const { data: updatedInvite, error } = await supabase
      .from('library_invites')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('library_id', libraryId)
      .select()
      .single();

    if (error) {
      console.error('Failed to revoke invite:', error);
      return NextResponse.json(
        { error: 'Failed to revoke invite' },
        { status: 500 }
      );
    }

    if (!updatedInvite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /invites/[inviteId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
