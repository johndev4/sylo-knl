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
  const { user } = useSession();
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
    const redirectParam = searchParams.get('redirect') || '/hub';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEncodedAuthNextParam(encodeURIComponent(redirectParam));

    // Redirect if user exists (covers both initialUser and fresh login)
    if (user) {
      if (redirectParam !== '/hub') window.location.replace(redirectParam);
      else router.replace(redirectParam);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: getAuthTheme(resolvedTheme === 'dark') }}
      providers={['google']}
      onlyThirdPartyProviders={process.env.NEXT_PUBLIC_TEST_MODE !== 'true'}
      redirectTo={`${getURL()}/auth/callback?next=${encodedAuthNextParam}`}
    />
  );
}
