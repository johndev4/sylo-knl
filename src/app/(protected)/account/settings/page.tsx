import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserProfile } from '@/features/user/queries';
import { createClient } from '@/lib/supabase/server';
import AccountSettingsForm from '@/features/user/components/account-settings-form';
import { Suspense } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { getUser } from '@/lib/auth/get-user';

export default function AccountSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center p-8 py-8 text-center text-sm">
          <Spinner className="text-muted-foreground h-8 w-8" />
          Loading…
        </div>
      }
    >
      <AccountSettingsPageContent />
    </Suspense>
  );
}

async function AccountSettingsPageContent() {
  const supabase = await createClient();
  const user = await getUser();
  const profile = await getUserProfile(supabase, user);

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>

          <CardContent>
            <p>Failed to load profile. Please try refreshing the page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AccountSettingsForm profile={profile} />;
}
