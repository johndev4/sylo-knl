'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { getAuthTheme } from '@/lib/themes/auth-theme';
import { useTheme } from 'next-themes';
import { getURL } from '@/lib/auth/utils';
import { useSession } from '@/components/providers/auth-provider';

export function SupabaseLogin() {
  const { user, event } = useSession();
  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme } = useTheme();

  const [encodedAuthNextParam, setEncodedAuthNextParam] = useState(
    encodeURIComponent('/')
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    const redirectParam = searchParams.get('redirect') || '/';

    (async () => setEncodedAuthNextParam(encodeURIComponent(redirectParam)))();

    // If we already have a user (e.g., from initialUser),
    // redirect them to the requested destination immediately.
    if (user) {
      router.push(redirectParam);
    }
  }, [user, router]); // Removed 'event' to prevent multiple triggers and focus on 'user' presence

  // Separate effect for handling the auth event specifically
  useEffect(() => {
    // console.log('[DEBUG] auth session:', event);
    if (event === 'SIGNED_IN' && user) {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect') || '/';
      // console.log('[DEBUG] redirect parameter:', redirectParam);
      window.location.replace(redirectParam);
    }
  }, [event, user]);

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: getAuthTheme(resolvedTheme === 'dark') }}
      providers={['google']}
      onlyThirdPartyProviders={
        process.env.NEXT_PUBLIC_TEST_MODE !== 'true' &&
        !['http://127.0.0.1:54321', 'http://localhost:54321'].includes(
          process.env.NEXT_PUBLIC_SUPABASE_URL!
        )
      }
      redirectTo={`${getURL()}/auth/callback?next=${encodedAuthNextParam}`}
    />
  );
}
