'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read theme from localStorage or system preference
    const stored = localStorage.getItem('app-theme');
    const isDarkMode =
      stored === 'dark' ||
      (stored !== 'light' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    // Apply theme class to html
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center',
        'bg-background text-foreground transition-colors'
      )}
    >
      <div className="space-y-6 px-4 text-center">
        <div>
          <h1 className="text-foreground mb-2 text-6xl font-bold">404</h1>
          <p className="text-muted-foreground text-lg">
            This page could not be found.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-foreground/70 text-sm">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link href="/">
            <Button size="lg" className="gap-2">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
