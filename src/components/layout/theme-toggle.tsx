'use client';

import { useTheme } from 'next-themes';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    (async () => setMounted(true))();
  }, []);

  if (!mounted) {
    return (
      <div className="size-10 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
    );
  }

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      variant={'ghost'}
      size={'icon'}
      className="rounded-full"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Moon data-icon="inline-start" />
      ) : (
        <Sun data-icon="inline-start" />
      )}
    </Button>
  );
}
