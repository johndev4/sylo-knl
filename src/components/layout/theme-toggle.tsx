'use client';

import { useTheme } from 'next-themes';
import { Button } from '../ui/button';
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
      <div className="size-10 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
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
      className="size-11 rounded-full sm:size-9"
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
