'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { getAuthTheme } from '@/lib/themes/auth-theme';
import { LoginHero } from '@/app/(auth)/login/_components/login-hero';
import { useTheme } from 'next-themes';
import { getURL } from '@/lib/auth/utils';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const authClient = createClient();

    const searchParams = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
    const redirectParam = searchParams.get('redirect') || '/hub';

    const checkSession = async () => {
      const {
        data: { session },
      } = await authClient.auth.getSession();

      if (session) {
        router.push(redirectParam);
      }
    };

    checkSession();

    const { data } = authClient.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        router.push(redirectParam);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }, [router]);

  return (
    <LoginHero>
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Login</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Safe and secure sign-in. Your data stays protected.
          </p>
        </div>
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
          redirectTo={`${getURL()}/auth/callback`}
        />
      </div>
    </LoginHero>
  );
}
