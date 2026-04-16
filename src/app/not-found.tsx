'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotFound() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read theme from localStorage or system preference
    const stored = localStorage.getItem('app-theme');
    const isDarkMode = stored === 'dark' || 
      (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setIsDark(isDarkMode);
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
        'min-h-screen flex items-center justify-center',
        'bg-background text-foreground transition-colors'
      )}
    >
      <div className="text-center space-y-6 px-4">
        <div>
          <h1 className="text-6xl font-bold mb-2 text-foreground">404</h1>
          <p className="text-lg text-muted-foreground">This page could not be found.</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-foreground/70">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <Button size="lg" className="gap-2">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
