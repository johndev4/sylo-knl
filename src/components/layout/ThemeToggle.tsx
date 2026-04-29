'use client';

import { useTheme } from '@/lib/hooks/useTheme';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-lg px-3 py-2',
          'border border-zinc-300 dark:border-zinc-700',
          'bg-white dark:bg-zinc-900'
        )}
      />
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
      variant={'outline'}
      size={'icon'}
      className="rounded-full"
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </Button>
  );
}
