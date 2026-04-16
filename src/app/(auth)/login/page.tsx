"use client";

import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { getAuthTheme } from "@/lib/themes/authTheme";

export default function LoginPage() {
  const supabase = createClient();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    updateTheme();
    setMounted(true);

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm w-full animate-fadeIn">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Safe and secure sign-in. Your data stays protected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: getAuthTheme(theme === 'dark') }}
            providers={["google"]}
            onlyThirdPartyProviders={true}
            redirectTo={`${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
