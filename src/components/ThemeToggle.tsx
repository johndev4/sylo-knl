'use client';

import { Sun, Moon } from 'lucide-react';
import { useThemeContext } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext();
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
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2',
        'border border-zinc-300 dark:border-zinc-700',
        'bg-white dark:bg-zinc-900',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800',
        'transition-smooth',
        'text-foreground'
      )}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
