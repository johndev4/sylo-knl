'use client';

import { createClient } from '@/lib/supabase/client';
import { Auth } from '@supabase/auth-ui-react';
import { getAuthTheme } from '@/lib/themes/authTheme';
import { LoginHero } from '@/app/(auth)/login/_components/LoginHero';
import { useTheme } from 'next-themes';

export default function LoginPage() {
  const supabase = createClient();
  const { resolvedTheme } = useTheme();

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
          onlyThirdPartyProviders={true}
          redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
        />
      </div>
    </LoginHero>
  );
}
