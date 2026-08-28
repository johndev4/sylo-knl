/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getInviteDetails } from '@/features/library/invite/queries';
import { joinLibraryAction } from '@/features/library/invite/actions';

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ inviteCode: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { inviteCode } = await params;
  const { error: actionError } = await searchParams;

  // 1. Fetch invite details and user auth
  const result = await getInviteDetails(inviteCode);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Handle join action form submission
  const handleJoin = async () => {
    'use server';
    const joinResult = await joinLibraryAction(inviteCode);

    // Redirect with error message if it fails
    if (!joinResult.success && joinResult.error) {
      redirect(
        `/join/${inviteCode}?error=${encodeURIComponent(joinResult.error)}`
      );
    }

    // Redirect to the library if successful
    // Assuming joinResult.data has the library_id based on your previous code
    const libraryId = (joinResult.data as any)?.library_id;
    redirect(`/hub/libraries/${libraryId}/documents`);
  };

  // 3. Render Invalid/Missing Invite
  if (result.error || !result.data) {
    return (
      <div className="bg-muted/30 flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">
            {result.error || 'This invite link is invalid or no longer exists.'}
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Return Home</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const invite = result.data;

  // 4. Render Valid Invite Page
  return (
    <div className="bg-muted/30 flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="mb-6 text-center">
          <Badge
            variant={invite.isValid ? 'default' : 'destructive'}
            className="mb-4"
          >
            {invite.isValid ? 'Valid Invite' : 'Expired / Maxed'}
          </Badge>
          <h1 className="text-2xl font-bold">{"You've been invited!"}</h1>
          <p className="text-muted-foreground mt-2">
            Join the library{' '}
            <span className="text-foreground font-semibold">
              {invite.libraryName}
            </span>
          </p>
        </div>

        <div className="bg-muted mb-6 flex items-center justify-between rounded-lg p-4 text-sm">
          <span className="text-muted-foreground">Assigned Role:</span>
          <span className="font-medium">{invite.role}</span>
        </div>

        {/* Display action errors here */}
        {actionError && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {actionError}
          </div>
        )}

        {!invite.isValid ? (
          <div className="space-y-4 text-center">
            <p className="text-destructive text-sm font-medium">
              {invite.isExpired
                ? 'This invite has expired.'
                : 'This invite has reached its maximum uses or is inactive.'}
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        ) : !user ? (
          <div className="space-y-4 text-center">
            <p className="text-muted-foreground mb-2 text-sm">
              Please sign in or create an account to accept this invite.
            </p>
            <Button asChild className="w-full">
              <Link href={`/login?redirect=/join/${inviteCode}`}>
                Sign In to Join
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-background mb-4 flex items-center gap-3 rounded-md border p-3">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full font-bold">
                {user.user_metadata?.name?.charAt(0) ||
                  user.email?.charAt(0) ||
                  'U'}
              </div>
              <div className="overflow-hidden text-sm text-ellipsis whitespace-nowrap">
                <p className="truncate font-medium">
                  {user.user_metadata?.name || 'User'}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {user.email}
                </p>
              </div>
            </div>

            {/* The form triggers the server action */}
            <form action={handleJoin}>
              <Button type="submit" className="w-full">
                Accept Invite
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}
