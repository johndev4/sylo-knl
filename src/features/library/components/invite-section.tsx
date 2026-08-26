/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card } from '@/components/ui/card';
import { getLibraryInvites } from '@/features/library/queries';
import { InviteSectionClient } from './invite-section-client';
import { createClient } from '@/lib/supabase/server';

interface InviteSectionProps {
  libraryId: string;
  membership: { role: any } | null;
}

export async function InviteSection({
  libraryId,
  membership,
}: InviteSectionProps) {
  const supabase = await createClient();
  const invites = await getLibraryInvites(libraryId, supabase, membership);

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Invite Links</h2>
        <p className="text-muted-foreground text-sm">
          Create shareable links to invite multiple users to your library.
        </p>
      </div>

      <InviteSectionClient libraryId={libraryId} initialInvites={invites} />
    </Card>
  );
}
