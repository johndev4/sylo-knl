import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserProfile } from '@/features/user/queries';
import { createClient } from '@/lib/supabase/server';
import AccountSettingsForm from '@/features/user/components/account-settings-form';
import { getUser } from '@/lib/auth/get-user';
import { randomUUID } from 'crypto';

export default async function AccountSettingsPage() {
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

  return <AccountSettingsForm key={randomUUID()} profile={profile} />;
}
